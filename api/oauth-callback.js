const Youtube = require(`youtube-api`)

const {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  VERCEL_URL,
} = process.env

module.exports = async (req, res, next) => {
  const yt = Youtube.authenticate({
    type: `oauth`,
    client_id: YOUTUBE_CLIENT_ID,
    client_secret: YOUTUBE_CLIENT_SECRET,
    redirect_url: `https://amos-youtube.vercel.app/api/oauth-callback`,
  })

  const {
    code,
  } = req.query

  const tokens = await yt.getToken(code)

  return res.json(tokens)
}
