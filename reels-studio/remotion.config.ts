import { Config } from '@remotion/cli/config'

Config.setVideoImageFormat('jpeg')
// Render por software: funciona en servidores sin GPU (el texto 3D usa WebGL).
Config.setChromiumOpenGlRenderer('swangle')
if (process.env.REMOTION_BROWSER_EXECUTABLE) Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE)
