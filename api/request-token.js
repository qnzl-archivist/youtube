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

  const url = yt.generateAuthUrl({
    access_type: `offline`,
    scope: [
      `https://www.googleapis.com/auth/youtube`,
    ],
  })

  return res.redirect(url)
}
