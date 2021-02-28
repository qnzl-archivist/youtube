const { google } = require('googleapis')

const {
  YOUTUBE_CLIENT_ID,
  YOUTUBE_CLIENT_SECRET,
  YOUTUBE_OAUTH_CALLBACK,
} = process.env

module.exports = async (req, res) => {
  const auth = new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_OAUTH_CALLBACK,
  )

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

  const tokens = await auth.refreshToken(refreshToken)

  const newAccessToken = await auth.getAccessToken()

  return res.json({ accessToken: newAccessToken })
}
