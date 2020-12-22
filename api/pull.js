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

const getSubscriptions = async () => {
  const { data: { items: subs } } = await Youtube.subscriptions.list({
    mine: true,
    part: [ `snippet` ],
    maxResults: 100,
  })

  const promises = subs.map(({ snippet: { resourceId: { channelId } } }) => {
    return getAllVideos({ channelId })
  })

  const results = await Promise.all(promises)

  return [].concat(...results)
}

const getAllVideos = async ({ channelId }) => {
  const videos = []

  let nextPageToken
  let resultCount

  do {
    const response = await Youtube.search.list({
      channelId,
      part: `snippet`,
      maxResults: 100,
      // TODO Fix to 7 days
      publishedAfter: dayjs().subtract(1, `day`).format()
    })

    const {
      data: {
        items,
        nextPageToken: _pageToken,
      }
    } = response

    const mappedVideos = items.map(({ snippet, id: { videoId } }) => ({ ...snippet, id: videoId }))

    videos.push(...mappedVideos)

    pageToken = _pageToken
    resultCount = items.length
  } while (resultCount === 100)

  return videos
}

const getVideos = async (opts) => {
  const videos = []

  let nextPageToken
  let resultCount

  do {
    const _opts = Object.assign({
      maxResults: 100,
      pageToken: nextPageToken,
      part: `snippet`
    }, opts)

    const response = await Youtube.videos.list(_opts)

    const {
      data: {
        items,
        nextPageToken: _pageToken,
      }
    } = response

    const mappedVideos = items.map(({ snippet, id }) => ({ ...snippet, id, needsHydration: true }))

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

  const subVideos = await getSubscriptions()

  const likedVideos = await getVideos({
    myRating: `like`,
  })

  const mostPopularVideos = await getVideos({
    chart: `mostPopular`,
  })

  return res.json({
    mostPopularVideos,
    likedVideos,
    subVideos,
  })
}
