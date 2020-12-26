const { google } = require(`googleapis`)
const dayjs = require(`dayjs`)

const {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REDIRECT_URL,
} = process.env

const Youtube = google.youtube(`v3`)

const auth = new google.auth.OAuth2(
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_REDIRECT_URL
)

const getSubscriptions = async (videoMapFunc) => {
  const { data: { items: subs } } = await Youtube.subscriptions.list({
    mine: true,
    part: [ `snippet` ],
    maxResults: 100,
  })

  const promises = subs.map(({ snippet: { resourceId: { channelId } } }) => {
    return getVideos({
      channelId,
      publishedAfter: dayjs().subtract(1, `days`).format(),
    }, videoMapFunc)
  })

  const results = await Promise.all(promises)

  return [].concat(...results)
}

const getVideos = async (opts, mapFunc) => {
  const videos = []

  let nextPageToken
  let resultCount

  // We want to do this once, to grab the intiail set of results
  do {
    // We only need snippet, to grab the video id
    const _opts = Object.assign({
      maxResults: 100,
      pageToken: nextPageToken,
      part: `snippet`
    }, opts)

    let response

    if (_opts.channelId) {
      response = await Youtube.search.list(_opts)
    } else {
      response = await Youtube.videos.list(_opts)
    }

    const {
      data: {
        items,
        nextPageToken: _pageToken,
      }
    } = response

    const mappedVideos = items.map(mapFunc)

    videos.push(...mappedVideos)

    pageToken = _pageToken
    resultCount = items.length
  } while (resultCount === 100)

  return videos
}

module.exports = async (req, res, next) => {
  const [ type, token ] = req.headers[`authorization`].split(` `)

  if (!type && !token) {
    return res.sendStatus(401)
  }

  const [ accessToken, refreshToken ] = Buffer.from(token, `base64`).toString(`utf8`).split(`:`)

  if (!accessToken) {
    return res.sendStatus(401)
  }

  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: `Bearer`,
  })

  google.options({ auth })

  const { scope } = req.query

  let entities = []

  // Taking responses and mapping them into what we want outputted, to strip away cruft
  const videoMapFunc = ({ snippet, id }) => ({ ...snippet, id, needsHydration: true })
  const subVideoMapFunc = ({ snippet, id: { videoId } }) => {

    if (!videoId || (snippet.liveBroadcastContent && snippet.liveBroadcastContent === `upcoming`)) {
      return {}
    }

    return { ...snippet, id: videoId }
  }

  switch(scope) {
    case `subscriptions`:
      entities = await getSubscriptions(subVideoMapFunc)

      break
    case `likes`:
      entities = await getVideos({
        myRating: `like`,
      }, videoMapFunc)

      break
    case `popular`:
      entities = await getVideos({
        chart: `mostPopular`,
      }, videoMapFunc)

      break
  }

  // Remove falsey entities
  // We may null out entities to get rid of them
  // if they are results we don't need / want, such as playlists
  // from Youtube.search.list
  entities = entities.filter(Boolean)

  return res.json({
    entities,
  })
}
