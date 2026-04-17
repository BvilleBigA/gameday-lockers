sub init()
  m.baseUrl = normalizeBaseUrl("https://lockers.bvillebiga.com")
  if m.global <> invalid and m.global.baseUrl <> invalid and m.global.baseUrl <> "" then
    m.baseUrl = normalizeBaseUrl(m.global.baseUrl)
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

  m.pairingTask = CreateObject("roSGNode", "PairingTask")
  m.pairingTask.baseUrl = m.baseUrl
  m.pairingTask.observeField("resultVersion", "onPairingTaskResult")

  m.pollTimer.observeField("fire", "onPollTimer")
  m.fxTimer.observeField("fire", "onFxTimer")

  renderPreparingState()

  m.displayId = loadDisplayId()
  m.isPaired = loadIsPaired() and m.displayId > 0
  savedCode = loadPairingCode()
  if isValidPairingCode(savedCode)
    m.pairingCode = savedCode
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
  if result.ok <> true or result.json = invalid or result.json.code = invalid then
    m.pairingCode = generatePairingCode()
  else
    code = result.json.code
    if type(code) = "roString" or type(code) = "String" then
      if isValidPairingCode(code) then
        m.pairingCode = code
      else
        m.pairingCode = generatePairingCode()
      end if
    else
      m.pairingCode = generatePairingCode()
    end if
  end if

  savePairingCode(m.pairingCode)
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
    renderLiveLoadingState()
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
    m.bgPoster.uri = scene.backgroundUrl
  end if
  hideOverlayUi()
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
    if raw <> invalid and (type(raw) = "roString" or type(raw) = "String")
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
sub init()
  m.baseUrl = "https://lockers.bvillebiga.com"
  if m.global <> invalid and m.global.baseUrl <> invalid and m.global.baseUrl <> "" then
    m.baseUrl = m.global.baseUrl
  end if
  if m.top.baseUrl <> invalid and m.top.baseUrl <> "" then
    m.baseUrl = m.top.baseUrl
  end if
  m.baseUrl = normalizeBaseUrl(m.baseUrl)
  m.storageSection = "gameday_lockers"
  m.storagePairingCodeKey = "pairing_code"
  m.storageDisplayIdKey = "display_id"
  m.storagePairedKey = "is_paired"
  m.currentMode = "pairing"
  m.fxTick = 0
  m.displayId = 0
  m.isPaired = false

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

  renderPreparingState()

  savedCode = loadPairingCode()
  m.displayId = loadDisplayId()
  m.isPaired = loadIsPaired() and m.displayId > 0
  if isValidPairingCode(savedCode) and savedCode <> "XXXX-XXXX"
    m.pairingCode = savedCode
  else
    m.pairingCode = requestServerPairingCode()
    if not isValidPairingCode(m.pairingCode) then
      m.pairingCode = generatePairingCode()
    end if
    savePairingCode(m.pairingCode)
  end if

  if m.isPaired then
    m.currentMode = "live"
    renderLiveLoadingState()
  else
    renderPairingState("Add this code in admin - nothing is saved until you register")
  end if
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
  endpoint = joinApiUrl("/api/displays/check?code=" + m.pairingCode)
  result = httpGetJsonWithDiagnostics(endpoint)
  if result = invalid or result.ok <> true
    reason = "Network error"
    if result <> invalid
      if result.failureReason <> invalid and result.failureReason <> "" then
        reason = result.failureReason
      end if
      reason = reason + " (HTTP " + result.status.ToStr() + ")"
    end if
    renderPairingState(reason)
    return
  end if
  response = result.json

  if response.registered = true
    if response.displayId <> invalid and type(response.displayId) = "roInt" then
      m.displayId = response.displayId
    else if response.displayId <> invalid and type(response.displayId) = "Integer" then
      m.displayId = response.displayId
    else
      m.displayId = 0
    end if
    m.isPaired = m.displayId > 0
    if m.isPaired then
      saveDisplayState(m.displayId, true)
    end if
    m.currentMode = "live"
    renderLiveLoadingState()
    loadCurrentScene()
  else
    m.isPaired = false
    m.displayId = 0
    saveDisplayState(0, false)
    renderPairingState("Add this code in admin - nothing is saved until you register")
  end if
end sub

sub loadCurrentScene()
  segment = m.pairingCode
  if m.isPaired and m.displayId > 0 then
    segment = m.displayId.ToStr()
  end if
  endpoint = joinApiUrl("/api/displays/" + segment + "/current-scene")
  transfer = CreateObject("roUrlTransfer")
  transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
  transfer.InitClientCertificates()
  transfer.SetUrl(endpoint)
  responseText = transfer.GetToString()
  status = transfer.GetResponseCode()

  if status = 404 or status = 409
    m.currentMode = "pairing"
    m.isPaired = false
    m.displayId = 0
    saveDisplayState(0, false)
    m.pairingCode = requestServerPairingCode()
    if not isValidPairingCode(m.pairingCode) then
      m.pairingCode = generatePairingCode()
    end if
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

function httpGetJsonWithDiagnostics(url as String) as Object
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(url)
  port = CreateObject("roMessagePort")
  request.SetPort(port)

  ok = request.AsyncGetToString()
  if ok <> true
    return { ok: false, status: 0, failureReason: "Could not start request", json: invalid }
  end if

  msg = wait(10000, port)
  if type(msg) <> "roUrlEvent"
    return { ok: false, status: 0, failureReason: "Request timeout", json: invalid }
  end if

  status = msg.GetResponseCode()
  failureReason = msg.GetFailureReason()
  body = msg.GetString()

  if status < 200 or status >= 300
    return { ok: false, status: status, failureReason: failureReason, json: invalid }
  end if

  parsed = ParseJson(body)
  if parsed = invalid
    return { ok: false, status: status, failureReason: "Invalid JSON response", json: invalid }
  end if

  return { ok: true, status: status, failureReason: failureReason, json: parsed }
end function

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

function joinApiUrl(path as String) as String
  p = path
  if p.Left(1) <> "/" then
    p = "/" + p
  end if
  return m.baseUrl + p
end function

function requestServerPairingCode() as String
  endpoint = joinApiUrl("/api/displays/request-code")
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(endpoint)
  request.SetRequest("POST")
  request.AddHeader("Content-Type", "application/json")

  responseText = request.GetToString()
  status = request.GetResponseCode()
  if status < 200 or status >= 300 then
    return ""
  end if
  json = ParseJson(responseText)
  if json = invalid or json.code = invalid then return ""
  code = json.code
  if type(code) <> "roString" and type(code) <> "String" then return ""
  return code
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
  m.helpLabel.text = "Admin -> Displays -> Add screens (lockers.bvillebiga.com)"
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
  m.statusLabel.text = "Preparing"
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

sub renderPreparingState()
  m.overlay.visible = true
  m.panelShadow.visible = true
  m.panelFrame.visible = true
  m.panel.visible = true
  m.panelInnerBorder.visible = true
  m.goldRule.visible = true
  m.titleLabel.visible = true
  m.subtitleLabel.visible = true
  m.statusLabel.visible = true
  m.codeLabel.visible = false
  m.helpLabel.visible = false

  m.titleLabel.text = "GAMEDAY LOCKERS"
  m.subtitleLabel.text = "ELEVATE THE LOCKER ROOM"
  m.statusLabel.text = "Preparing"
end sub

function generatePairingCode() as String
  chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
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
      if raw <> "" then
        return Val(raw)
      end if
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
