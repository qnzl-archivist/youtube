const { google } = require('googleapis')

const {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_OAUTH_CALLBACK,
} = process.env

module.exports = async (req, res, next) => {
  const yt = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_OAUTH_CALLBACK,
  )

  const {
    code,
  } = req.query

  const tokens = await yt.getToken(code)

  return res.json(tokens)
}
