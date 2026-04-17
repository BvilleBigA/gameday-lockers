sub Main()
  print "--- APP STARTING ---"
  screen = CreateObject("roSGScreen")
  port = CreateObject("roMessagePort")
  screen.SetMessagePort(port)

  scene = screen.CreateScene("MainScene")
  global = screen.GetGlobalNode()
  if global <> invalid then
    global.addFields({
      baseUrl: "https://lockers.bvillebiga.com"
    })
  end if
  scene.baseUrl = "https://lockers.bvillebiga.com"
  screen.Show()

  while true
    msg = wait(0, port)
    if type(msg) = "roSGScreenEvent"
      if msg.isScreenClosed() then return
    end if
  end while
end sub
