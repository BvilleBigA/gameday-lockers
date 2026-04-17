sub init()
  m.baseUrl = normalizeBaseUrl("https://lockers.bvillebiga.com")
  if m.global <> invalid and m.global.baseUrl <> invalid and m.global.baseUrl <> "" then
    m.baseUrl = normalizeBaseUrl(m.global.baseUrl.Trim())
  end if
  if m.top.baseUrl <> invalid and m.top.baseUrl <> "" then
    m.baseUrl = normalizeBaseUrl(m.top.baseUrl)
  end if

  m.storageSection = "gameday_lockers"
  m.storagePairingCodeKey = "pairing_code"
  m.storageDisplayIdKey = "display_id"
  m.storagePairedKey = "is_paired"
  m.currentMode = "pairing"
  m.displayId = 0
  m.isPaired = false
  m.taskBusy = false
  m.lastTaskType = ""
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

  m.pairingTask = m.top.findNode("pairingTask")
  if m.pairingTask = invalid then
    m.pairingTask = CreateObject("roSGNode", "PairingTask")
  end if
  m.pairingTask.baseUrl = m.baseUrl
  m.pairingTask.observeField("pairingCode", "onPairingCodeReceived")
  m.pairingTask.observeField("resultVersion", "onPairingTaskResult")

  m.pollTimer.observeField("fire", "onPollTimer")
  m.fxTimer.observeField("fire", "onFxTimer")

  renderPreparingState()

  m.displayId = loadDisplayId()
  m.isPaired = loadIsPaired() and m.displayId > 0
  savedCode = loadPairingCode()
  if isValidPairingCode(savedCode)
    m.pairingCode = savedCode
    m.codeLabel.text = m.pairingCode
    if m.isPaired then
      m.currentMode = "live"
      renderLiveLoadingState()
    else
      m.currentMode = "pairing"
      renderPairingState("Add this code in admin - nothing is saved until you register")
    end if
  else
    m.pairingCode = ""
    startPairingTask("requestServerPairingCode", "")
  end if

  m.pollTimer.control = "start"
  m.fxTimer.control = "start"
end sub

sub onPollTimer()
  if m.taskBusy then return
  if not isValidPairingCode(m.pairingCode) then return

  if m.currentMode = "pairing"
    startPairingTask("checkRegistration", "")
  else
    segment = m.pairingCode
    if m.isPaired and m.displayId > 0 then segment = m.displayId.ToStr()
    startPairingTask("loadCurrentScene", segment)
  end if
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

sub onPairingCodeReceived(obj as Object)
  if obj = invalid then return
  code = obj.getData()
  if code <> invalid and (type(code) = "roString" or type(code) = "String") and isValidPairingCode(code) then
    m.pairingCode = code
    m.codeLabel.text = code
    savePairingCode(code)
    if m.currentMode <> "live" then
      m.currentMode = "pairing"
      renderPairingState("Add this code in admin - nothing is saved until you register")
    end if
  end if
end sub

sub startPairingTask(requestType as String, displaySegment as String)
  if m.taskBusy then return
  m.taskBusy = true
  m.lastTaskType = requestType
  m.pairingTask.requestType = requestType
  m.pairingTask.pairingCode = m.pairingCode
  m.pairingTask.displaySegment = displaySegment
  m.pairingTask.control = "RUN"
end sub

sub onPairingTaskResult()
  m.taskBusy = false
  result = m.pairingTask.result
  if result = invalid then return

  reqType = result.requestType
  if reqType = invalid or reqType = "" then reqType = m.lastTaskType

  if reqType = "requestServerPairingCode"
    handleServerPairingCode(result)
  else if reqType = "checkRegistration"
    handleRegistrationResult(result)
  else if reqType = "loadCurrentScene"
    handleCurrentSceneResult(result)
  end if
end sub

sub handleServerPairingCode(result as Object)
  if result.ok = true and result.json <> invalid and result.json.code <> invalid then
    code = result.json.code
    if type(code) = "roString" or type(code) = "String" then
      m.pairingCode = code
      m.codeLabel.text = code
      savePairingCode(code)
    end if
  else
    m.pairingCode = generatePairingCode()
    m.codeLabel.text = m.pairingCode
    savePairingCode(m.pairingCode)
  end if

  m.currentMode = "pairing"
  m.isPaired = false
  m.displayId = 0
  saveDisplayState(0, false)
  renderPairingState("Add this code in admin - nothing is saved until you register")
end sub

sub handleRegistrationResult(result as Object)
  if result.ok <> true or result.json = invalid
    renderPairingState("Network error (HTTP " + result.status.ToStr() + ")")
    return
  end if

  response = result.json
  if response.registered = true
    id = 0
    if response.displayId <> invalid and (type(response.displayId) = "roInt" or type(response.displayId) = "Integer") then
      id = response.displayId
    end if
    m.displayId = id
    m.isPaired = id > 0
    saveDisplayState(m.displayId, m.isPaired)
    m.currentMode = "live"
    showContentGroup()
    segment = m.pairingCode
    if m.isPaired and m.displayId > 0 then segment = m.displayId.ToStr()
    startPairingTask("loadCurrentScene", segment)
  else
    m.currentMode = "pairing"
    m.isPaired = false
    m.displayId = 0
    saveDisplayState(0, false)
    renderPairingState("Add this code in admin - nothing is saved until you register")
  end if
end sub

sub handleCurrentSceneResult(result as Object)
  if result.ok <> true
    if result.status = 404 or result.status = 409
      m.currentMode = "pairing"
      m.isPaired = false
      m.displayId = 0
      saveDisplayState(0, false)
      startPairingTask("requestServerPairingCode", "")
      return
    end if
    renderLiveErrorState("Could not load live screen.")
    return
  end if

  if result.json = invalid or result.json.scene = invalid
    renderLiveErrorState("Invalid response from server.")
    return
  end if

  scene = result.json.scene
  if scene.backgroundUrl <> invalid and scene.backgroundUrl <> ""
    mediaUrl = ensureAbsoluteMediaUrl(scene.backgroundUrl)
    print "Downloading image: "; mediaUrl
    m.bgPoster.visible = true
    m.bgPoster.uri = mediaUrl
  end if
  showContentGroup()
end sub

sub hideOverlayUi()
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

sub showContentGroup()
  m.bgPoster.visible = true
  hideOverlayUi()
end sub

sub showOverlayUi()
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
end sub

sub renderPairingState(statusText as String)
  showOverlayUi()
  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "ELEVATE THE LOCKER ROOM"
  m.statusLabel.text = statusText
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Admin -> Displays -> Add screens (lockers.bvillebiga.com)"
end sub

sub renderLiveLoadingState()
  showOverlayUi()
  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "SCREEN CONNECTED"
  m.statusLabel.text = "Preparing"
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Connected to lockers.bvillebiga.com"
end sub

sub renderLiveErrorState(statusText as String)
  showOverlayUi()
  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "NETWORK STATUS"
  m.statusLabel.text = statusText
  m.codeLabel.text = m.pairingCode
  m.helpLabel.text = "Retrying automatically..."
end sub

sub renderPreparingState()
  showOverlayUi()
  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "ELEVATE THE LOCKER ROOM"
  m.statusLabel.text = "Preparing"
  m.codeLabel.text = ""
  m.helpLabel.text = ""
end sub

function normalizeBaseUrl(raw as String) as String
  if raw = invalid or raw = "" then return "https://lockers.bvillebiga.com"
  value = raw.Trim()
  if value.Left(7) <> "http://" and value.Left(8) <> "https://" then
    value = "https://" + value
  end if
  while value.Right(1) = "/"
    value = value.Left(Len(value) - 1)
  end while
  return value
end function

function ensureAbsoluteMediaUrl(url as String) as String
  value = url.Trim()
  if value = "" then return value
  if value.Left(8) = "https://" or value.Left(7) = "http://" then return value
  if value.Left(8) = "/uploads/" then return m.baseUrl + value
  if value.Left(1) = "/" then return m.baseUrl + value
  return m.baseUrl + "/" + value
end function

function generatePairingCode() as String
  chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  out = ""
  now = CreateObject("roDateTime")
  seed = now.AsSeconds()
  for i = 1 to 8
    seed = (seed * 1103515245 + 12345 + i) mod 2147483647
    idx = seed mod Len(chars)
    out = out + chars.Mid(idx + 1, 1)
  end for
  return out.Left(4) + "-" + out.Right(4)
end function

function isValidPairingCode(value as Dynamic) as Boolean
  if value = invalid then return false
  if type(value) <> "roString" and type(value) <> "String" then return false
  if Len(value) <> 9 then return false
  if Mid(value, 5, 1) <> "-" then return false
  return true
end function

function loadPairingCode() as String
  section = CreateObject("roRegistrySection", m.storageSection)
  if section.Exists(m.storagePairingCodeKey)
    return section.Read(m.storagePairingCodeKey)
  end if
  return ""
end function

sub savePairingCode(code as String)
  section = CreateObject("roRegistrySection", m.storageSection)
  section.Write(m.storagePairingCodeKey, code)
  section.Flush()
end sub

function loadDisplayId() as Integer
  section = CreateObject("roRegistrySection", m.storageSection)
  if section.Exists(m.storageDisplayIdKey)
    raw = section.Read(m.storageDisplayIdKey)
    if raw <> invalid and (type(raw) = "roString" or type(raw) = "String") then
      if raw <> "" then return Val(raw)
    end if
  end if
  return 0
end function

function loadIsPaired() as Boolean
  section = CreateObject("roRegistrySection", m.storageSection)
  if section.Exists(m.storagePairedKey)
    raw = section.Read(m.storagePairedKey)
    if raw <> invalid and (type(raw) = "roString" or type(raw) = "String") then
      return raw = "1"
    end if
  end if
  return false
end function

sub saveDisplayState(displayId as Integer, isPaired as Boolean)
  section = CreateObject("roRegistrySection", m.storageSection)
  section.Write(m.storageDisplayIdKey, displayId.ToStr())
  if isPaired then
    section.Write(m.storagePairedKey, "1")
  else
    section.Write(m.storagePairedKey, "0")
  end if
  section.Flush()
end sub
