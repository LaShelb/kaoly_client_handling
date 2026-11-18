// Coquille Mac : lance le serveur local et l'affiche dans une fenêtre.
import Cocoa
import WebKit

let bun = "__BUN__", root = "__ROOT__", port = "4118"

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
  var window: NSWindow!
  var web: WKWebView!
  let server = Process()
  var titleWatch: NSKeyValueObservation?

  func applicationDidFinishLaunching(_ note: Notification) {
    server.executableURL = URL(fileURLWithPath: bun)
    server.arguments = ["run", root + "/server.ts"]
    var env = ProcessInfo.processInfo.environment
    env["PORT"] = port
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin" // pour trouver `git`, `gh` et `security`
    server.environment = env
    try? server.run() // si le port est déjà pris par une copie en cours, on affiche celle-là

    window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 860),
                      styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
    window.title = "Kaoly Clients"
    window.titleVisibility = .hidden
    window.titlebarAppearsTransparent = true
    window.backgroundColor = NSColor(red: 0.788, green: 0.875, blue: 0.929, alpha: 1) // le haut du ciel de la page (#c9dfed) : la barre de titre et la page ne font qu'un
    window.minSize = NSSize(width: 720, height: 480)
    window.center()
    window.setFrameAutosaveName("Kaoly Clients")
    window.isReleasedWhenClosed = false // fermer la fenêtre ne détruit rien : la relève et Claude continuent
    let conf = WKWebViewConfiguration()
    if #available(macOS 14.0, *) { conf.preferences.inactiveSchedulingPolicy = .none } // badge du Dock à jour fenêtre fermée (à confirmer)
    web = WKWebView(frame: .zero, configuration: conf)
    web.navigationDelegate = self
    web.uiDelegate = self
    window.contentView = web
    // la page écrit « Kaoly Clients (3) » dans son titre : le nombre de demandes à toi va sur l'icône du Dock
    titleWatch = web.observe(\.title) { w, _ in
      let t = w.title ?? ""
      NSApp.dockTile.badgeLabel = t.range(of: #"(?<=\()\d+(?=\))"#, options: .regularExpression).map { String(t[$0]) }
    }
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)
    open()
  }

  func open() { web.load(URLRequest(url: URL(string: "http://127.0.0.1:\(port)/")!)) }

  // le serveur met un instant à démarrer : on réessaie tant qu'il ne répond pas
  func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { self.open() }
  }
  // les liens (code sur GitHub, pièces jointes) s'ouvrent dans le navigateur, jamais dans la fenêtre
  func dehors(_ u: URL?) -> Bool {
    guard let u = u, ["http", "https"].contains(u.scheme) else { return false }
    NSWorkspace.shared.open(u); return true
  }
  func webView(_ w: WKWebView, createWebViewWith c: WKWebViewConfiguration, for a: WKNavigationAction, windowFeatures f: WKWindowFeatures) -> WKWebView? {
    _ = dehors(a.request.url); return nil
  }
  func webView(_ w: WKWebView, decidePolicyFor a: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    if a.navigationType == .linkActivated, a.request.url?.host != "127.0.0.1", dehors(a.request.url) { decisionHandler(.cancel) } else { decisionHandler(.allow) }
  }
  func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { false }
  func applicationShouldHandleReopen(_ s: NSApplication, hasVisibleWindows v: Bool) -> Bool {
    if !v { window.makeKeyAndOrderFront(nil) }
    return true
  }
  func applicationWillTerminate(_ note: Notification) { if server.isRunning { server.terminate() } }
}

let app = NSApplication.shared
let menu = NSMenu()
let appItem = NSMenuItem(); menu.addItem(appItem)
appItem.submenu = NSMenu()
appItem.submenu!.addItem(withTitle: "Quitter Kaoly Clients", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
appItem.submenu!.addItem(withTitle: "Fermer la fenêtre", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
let editItem = NSMenuItem(); menu.addItem(editItem)
editItem.submenu = NSMenu(title: "Édition") // sans ce menu, impossible de coller un message de client
editItem.submenu!.addItem(withTitle: "Couper", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
editItem.submenu!.addItem(withTitle: "Copier", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
editItem.submenu!.addItem(withTitle: "Coller", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
editItem.submenu!.addItem(withTitle: "Tout sélectionner", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
let viewItem = NSMenuItem(); menu.addItem(viewItem)
viewItem.submenu = NSMenu(title: "Présentation")
viewItem.submenu!.addItem(withTitle: "Recharger", action: #selector(WKWebView.reload(_:)), keyEquivalent: "r")
app.mainMenu = menu
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
