sub init()
  m.top.functionName = "execute"
end sub

sub execute()
  reqType = m.top.requestType
  result = {
    ok: false
    requestType: reqType
    status: 0
    failureReason: ""
    json: invalid
  }

  if reqType = "requestServerPairingCode"
    result = requestServerPairingCode()
    if result.ok = true and result.json <> invalid and result.json.code <> invalid then
      code = result.json.code
      if type(code) = "roString" or type(code) = "String" then
        m.top.pairingCode = code
      end if
    end if
  else if reqType = "checkRegistration"
    result = checkRegistration()
  else if reqType = "loadCurrentScene"
    result = loadCurrentScene()
  else
    result.failureReason = "Unknown request type"
  end if

  m.top.result = result
  m.top.resultVersion = m.top.resultVersion + 1
end sub

function requestServerPairingCode() as Object
  endpoint = joinApiUrl("/api/displays/request-code")
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(endpoint)
  request.SetRequest("POST")
  request.AddHeader("Content-Type", "application/json")
  body = request.GetToString()
  if body <> invalid and body <> ""
    parsed = ParseJson(body)
    if parsed <> invalid and parsed.code <> invalid
      code = parsed.code
      if type(code) = "roString" or type(code) = "String"
        return { ok: true, requestType: "requestServerPairingCode", status: 200, failureReason: "", json: { code: code } }
      end if
    end if
  end if

  fallback = generatePairingCode()
  return { ok: true, requestType: "requestServerPairingCode", status: 0, failureReason: "Using local fallback code", json: { code: fallback } }
end function

function checkRegistration() as Object
  code = m.top.pairingCode
  endpoint = joinApiUrl("/api/displays/check?code=" + code)
  return httpGet(endpoint, "checkRegistration")
end function

function loadCurrentScene() as Object
  segment = m.top.displaySegment
  endpoint = joinApiUrl("/api/displays/" + segment + "/current-scene")
  result = httpGet(endpoint, "loadCurrentScene")
  if result.ok <> true or result.json = invalid or result.json.scene = invalid then
    return result
  end if

  scene = result.json.scene
  if scene.backgroundUrl <> invalid and (type(scene.backgroundUrl) = "roString" or type(scene.backgroundUrl) = "String") then
    mediaUrl = normalizeMediaUrl(scene.backgroundUrl)
    if mediaUrl <> ""
      print "Downloading image: "; mediaUrl
      if canDownloadImage(mediaUrl) then
        scene.backgroundUrl = mediaUrl
      else
        return {
          ok: false
          requestType: "loadCurrentScene"
          status: 0
          failureReason: "Image download failed"
          json: invalid
        }
      end if
    end if
  end if

  return result
end function

function httpGet(url as String, requestType as String) as Object
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(url)
  body = request.GetToString()
  if body = invalid or body = ""
    return { ok: false, requestType: requestType, status: 0, failureReason: "Empty response", json: invalid }
  end if

  parsed = ParseJson(body)
  if parsed = invalid
    return { ok: false, requestType: requestType, status: 0, failureReason: "Invalid JSON response", json: invalid }
  end if

  return { ok: true, requestType: requestType, status: 200, failureReason: "", json: parsed }
end function

function joinApiUrl(path as String) as String
  base = m.top.baseUrl
  if base = invalid or base = "" then base = "https://lockers.bvillebiga.com"
  base = base.Trim()
  while base.Right(1) = "/"
    base = base.Left(Len(base) - 1)
  end while

  p = path
  if p.Left(1) <> "/" then p = "/" + p
  return base + p
end function

function normalizeMediaUrl(rawUrl as String) as String
  value = rawUrl.Trim()
  if value = "" then return ""
  if value.Left(8) = "https://" or value.Left(7) = "http://" then return value
  if value.Left(1) = "/" then return joinApiUrl(value)
  return joinApiUrl("/" + value)
end function

function canDownloadImage(url as String) as Boolean
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(url)
  body = request.GetToString()
  return body <> invalid and body <> ""
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
