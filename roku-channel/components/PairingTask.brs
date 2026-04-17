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
  status = request.GetResponseCode()

  if status >= 200 and status < 300
    parsed = ParseJson(body)
    if parsed <> invalid and parsed.code <> invalid
      code = parsed.code
      if type(code) = "roString" or type(code) = "String"
        return { ok: true, requestType: "requestServerPairingCode", status: status, failureReason: "", json: { code: code } }
      end if
    end if
  end if

  fallback = generatePairingCode()
  return { ok: true, requestType: "requestServerPairingCode", status: status, failureReason: "Using local fallback code", json: { code: fallback } }
end function

function checkRegistration() as Object
  code = m.top.pairingCode
  endpoint = joinApiUrl("/api/displays/check?code=" + code)
  return httpGet(endpoint, "checkRegistration")
end function

function loadCurrentScene() as Object
  segment = m.top.displaySegment
  endpoint = joinApiUrl("/api/displays/" + segment + "/current-scene")
  return httpGet(endpoint, "loadCurrentScene")
end function

function httpGet(url as String, requestType as String) as Object
  request = CreateObject("roUrlTransfer")
  request.SetCertificatesFile("common:/certs/ca-bundle.crt")
  request.InitClientCertificates()
  request.SetUrl(url)
  body = request.GetToString()
  status = request.GetResponseCode()

  if status < 200 or status >= 300
    return { ok: false, requestType: requestType, status: status, failureReason: "HTTP error", json: invalid }
  end if

  parsed = ParseJson(body)
  if parsed = invalid
    return { ok: false, requestType: requestType, status: status, failureReason: "Invalid JSON response", json: invalid }
  end if

  return { ok: true, requestType: requestType, status: status, failureReason: "", json: parsed }
end function

function joinApiUrl(path as String) as String
  base = m.top.baseUrl
  if base = invalid or base = "" then base = "https://lockers.bvillebiga.com"
  while base.Right(1) = "/"
    base = base.Left(Len(base) - 1)
  end while

  p = path
  if p.Left(1) <> "/" then p = "/" + p
  return base + p
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
