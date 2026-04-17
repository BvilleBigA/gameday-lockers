sub init()
  m.baseUrl = "https://lockers.bvillebiga.com"
  m.storageSection = "gameday_lockers"
  m.storageKey = "pairing_code"
  m.currentMode = "pairing"
  m.fxTick = 0

  m.bgPoster = m.top.findNode("bgPoster")
  m.overlay = m.top.findNode("overlay")
  m.panelShadow = m.top.findNode("panelShadow")
  m.panelFrame = m.top.findNode("panelFrame")
  m.panel = m.top.findNode("panel")
  m.panelInnerBorder = m.top.findNode("panelInnerBorder")
  m.goldRule = m.top.findNode("goldRule")
  m.titleLabel = m.top.findNode("titleLabel")
  m.subtitleLabel = m.top.findNode("subtitleLabel")
  m.statusLabel = m.top.findNode("statusLabel")
  m.codeLabel = m.top.findNode("codeLabel")
  m.helpLabel = m.top.findNode("helpLabel")
  m.pollTimer = m.top.findNode("pollTimer")
  m.fxTimer = m.top.findNode("fxTimer")

  m.pollTimer.observeField("fire", "onPollTimer")
  m.fxTimer.observeField("fire", "onFxTimer")

  savedCode = loadPairingCode()
  if isValidPairingCode(savedCode)
    m.pairingCode = savedCode
  else
    m.pairingCode = generatePairingCode()
    savePairingCode(m.pairingCode)
  end if

  renderPairingState("Waiting for registration...")
  m.pollTimer.control = "start"
  m.fxTimer.control = "start"
end sub

sub onPollTimer()
  pollServer()
end sub

sub onFxTimer()
  m.fxTick = m.fxTick + 1
  if m.fxTick mod 2 = 0
    m.goldRule.color = "0xE3C76DFF"
    m.panelFrame.color = "0xC4A05277"
  else
    m.goldRule.color = "0xC4A052FF"
    m.panelFrame.color = "0x7D6A3A66"
  end if
end sub

sub pollServer()
  if m.currentMode = "pairing"
    checkDisplayRegistration()
  else
    loadCurrentScene()
  end if
end sub

sub checkDisplayRegistration()
  endpoint = m.baseUrl + "/api/displays/check?code=" + m.pairingCode
  response = httpGetJson(endpoint)
  if response = invalid then return

  if response.registered = true
    m.currentMode = "live"
    renderLiveLoadingState()
    loadCurrentScene()
  else
    renderPairingState("Waiting for registration...")
  end if
end sub

sub loadCurrentScene()
  endpoint = m.baseUrl + "/api/displays/" + m.pairingCode + "/current-scene"
  transfer = CreateObject("roUrlTransfer")
  transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
  transfer.InitClientCertificates()
  transfer.SetUrl(endpoint)
  responseText = transfer.GetToString()
  status = transfer.GetResponseCode()

  if status = 404 or status = 409
    m.currentMode = "pairing"
    m.pairingCode = generatePairingCode()
    savePairingCode(m.pairingCode)
    renderPairingState("This screen was removed. Register this new code.")
    return
  end if

  if status < 200 or status >= 300
    renderLiveErrorState("Could not load live screen.")
    return
  end if

  json = ParseJson(responseText)
  if json = invalid or json.scene = invalid
    renderLiveErrorState("Invalid response from server.")
    return
  end if

  scene = json.scene
  if scene.backgroundUrl <> invalid and scene.backgroundUrl <> ""
    m.bgPoster.uri = scene.backgroundUrl
  end if

  m.overlay.visible = false
  m.panelShadow.visible = false
  m.panelFrame.visible = false
  m.panel.visible = false
  m.panelInnerBorder.visible = false
  m.goldRule.visible = false
  m.titleLabel.visible = false
  m.subtitleLabel.visible = false
  m.statusLabel.visible = false
  m.codeLabel.visible = false
  m.helpLabel.visible = false
end sub

function httpGetJson(url as String) as Dynamic
  transfer = CreateObject("roUrlTransfer")
  transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
  transfer.InitClientCertificates()
  transfer.SetUrl(url)
  responseText = transfer.GetToString()
  status = transfer.GetResponseCode()
  if status < 200 or status >= 300
    return invalid
  end if
  return ParseJson(responseText)
end function

sub renderPairingState(statusText as String)
  m.overlay.visible = true
  m.panelShadow.visible = true
  m.panelFrame.visible = true
  m.panel.visible = true
  m.panelInnerBorder.visible = true
  m.goldRule.visible = true
  m.titleLabel.visible = true
  m.subtitleLabel.visible = true
  m.statusLabel.visible = true
  m.codeLabel.visible = true
  m.helpLabel.visible = true

  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "ELEVATE THE LOCKER ROOM"
  m.statusLabel.text = statusText
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Admin > Displays > Add screens at lockers.bvillebiga.com"
end sub

sub renderLiveLoadingState()
  m.overlay.visible = true
  m.panelShadow.visible = true
  m.panelFrame.visible = true
  m.panel.visible = true
  m.panelInnerBorder.visible = true
  m.goldRule.visible = true
  m.titleLabel.visible = true
  m.subtitleLabel.visible = true
  m.statusLabel.visible = true
  m.codeLabel.visible = true
  m.helpLabel.visible = true

  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "SCREEN CONNECTED"
  m.statusLabel.text = "Registered. Loading scene..."
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Connected to lockers.bvillebiga.com"
end sub

sub renderLiveErrorState(statusText as String)
  m.overlay.visible = true
  m.panelShadow.visible = true
  m.panelFrame.visible = true
  m.panel.visible = true
  m.panelInnerBorder.visible = true
  m.goldRule.visible = true
  m.titleLabel.visible = true
  m.subtitleLabel.visible = true
  m.statusLabel.visible = true
  m.codeLabel.visible = true
  m.helpLabel.visible = true

  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "NETWORK STATUS"
  m.statusLabel.text = statusText
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Retrying automatically..."
end sub

function generatePairingCode() as String
  chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  out = ""
  now = CreateObject("roDateTime")
  seed = now.AsSeconds()
  for i = 1 to 8
    seed = (seed * 1103515245 + 12345 + i) mod 2147483647
    idx = seed mod Len(chars)
    out = out + Mid(chars, idx + 1, 1)
  end for
  return Left(out, 4) + "-" + Right(out, 4)
end function

function isValidPairingCode(value as Dynamic) as Boolean
  if value = invalid then return false
  if type(value) <> "roString" and type(value) <> "String" then return false
  if Len(value) <> 9 then return false
  return true
end function

function loadPairingCode() as String
  section = CreateObject("roRegistrySection", m.storageSection)
  if section.Exists(m.storageKey)
    return section.Read(m.storageKey)
  end if
  return ""
end function

sub savePairingCode(code as String)
  section = CreateObject("roRegistrySection", m.storageSection)
  section.Write(m.storageKey, code)
  section.Flush()
end sub
