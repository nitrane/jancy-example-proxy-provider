
/* The ProxyProviderFactory object that can create providers that are capable
** of creating proxies returned from a fictious API.
*/
const ProxyProviderFactory = {
  id: 'b504159b-9699-4876-a1d1-395ca752aeb4',
  description: 'Load proxies from our fictitious API',
  showFactoriesToUser: true,
  persistProviders: true,
  createProvider(jancy, state=null) {
    return new ProxyProvider(jancy, state)
  },
  addProvider(jancy, browserWindow) {
    dialog(jancy, browserWindow)
  },
  editProvider(jancy, browserWindow, provider) {
    dialog(jancy, browserWindow, provider)
  }
}


/* The ProxyProvider class that knows how connect to a fake
** API and stores the proxies returned from it.
*/
class ProxyProvider {

  constructor(jancy, { url, name } = {}) {
    this.jancy = jancy
    this.url = url
    this.name = name
    this.nextProxy = 0    // index of the next proxy to return from this.proxies
    this.proxies = []     // each provider instance maintains their own list of proxies
    this.state = 0        // 0 = no proxies loaded, 1 = user needs to reload, 2 = error, anything else = good to go
  }

  /* Load the proxies.
  **
  ** Returns a promise that should resolve with a boolean to indicate
  ** success or failure.
  */
  loadProxies() {    
    return new Promise(async ( resolve, reject ) => {

      this.proxies = []

      let proxies = []

      /* The following is a deomonstration of what you'd do in Jancy to connect to
      ** the API at this.url (our fictitious API endpoint) using AXIOS.
      **
      ** try {
      **   const r = await this.jancy.axios.get(this.url)
      **   if (r.status === 200) {
      **     proxies = res.data
      **   } else {
      **     this.state = 2   // error
      **     resolve(false)
      **     return
      **   }
      ** } catch(err) {
      **    this.state = 2    // error
      **    resolve(false)
      **   return
      ** }
      */

      /* Lets pretend the API returned a couple of proxies in some proprietary format... 
      */
      proxies = [
        {
          ip: "127.0.0.1",
          port: 4567,
          username: "my-username",
          password: "my-password"
        },
        {
          ip: "1.0.0.721",
          port: 7654,
          username: "emanresu-ym",
          password: "drowssap-ym"
        }
      ]

      /* We need to turn these proxies into proper proxy objects that Jancy can use.
      */
      this.proxies = proxies.map((proxy, idx) => {
        const name = `Proxy ${ idx + 1}`
        const { ip, port, username, password } = proxy
        return this.jancy.proxyFactory.createSync({ name, host: ip, port, username, password })
      })

      this.state = 999
      resolve(true)
    })
  }

  /* Returns the name of this provider.
  */
  getName() {
    return this.name
  }

  /* Returns the number of proxies stored in the provider.
  */
  getProxyCount() {
    return this.proxies.length
  }

  /* Return the next proxy from the list of proxies or null.
  */
  getNextProxy() {
    let proxy = null

    if (this.proxies.length) {
      if (this.nextProxy >= this.proxies.length) {
        this.nextProxy = 0
      }

      proxy = this.proxies[this.nextProxy]
      this.nextProxy = (this.nextProxy + 1) % this.proxies.length
    }

    return proxy
  }

  /* Returns a specific proxy.
  **
  ** Arguments:
  **    id (string)
  */
  getProxy(id) {
    return this.proxies.find(p => p.id === id)
  }

  /* Returns all the proxies.
  */
  getProxies() {
    return this.proxies
  }

  /* Return a human readable string that describes the current state of
  ** this provider.
  */
  getInfo() {
    switch(this.state) {
      case 0:
        return 'No proxies loaded'
      case 1:
        return 'Press the reload button for changes to take effect'
      case 2:
        return `Failed to load proxies from ${ this.url }`
      default:
        return `${ this.proxies.length } proxies loaded`
    }
  }

  /* Return an object that can be fed back into the constructor to
  ** recreate this provider.
  */
  getState() {
    return {
      url: this.url,
      name: this.name
    }
  }

  /* Update this provider from the output of the dialog.
  **
  ** Arguments:
  **    args (object)
  **      url (string)
  **      name (string)
  */
  update(args) {

    if (args.url !== this.url) {
      this.url = args.url
      this.state = 1
    }

    if (args.name !== this.name) {
      this.name = args.name
      this.state = 1
    }
  }
}


/* Display a dialog to either create this provider or edit an existing one.
**
** Arguments:
**    jancy (Jancy)
**    browserWindow (BrowserWindow)
**    provider (ProxyProvider): optional
*/
function dialog (jancy, browserWindow, provider) {

  let providerWindow = this.jancy.dialogFactory.create(
    browserWindow,
    {
      width: 400,
      height: 150,
      title: provider ? `Edit ${ provider.getName() }` : 'Configure Example Proxy Provider'
    },
    {
      centerRelativeToParent: true
    }
  )

  jancy.actionRegistry.register("example-proxy-provider:save", (args, sender) => {
    if (provider) {
      provider.update(args)
      jancy.proxyProviders.saveProvider(provider)
    } else {
      jancy.proxyProviders.createProvider(ProxyProviderFactory, args)
    }
  })

  providerWindow.on('ready-to-show', () => {

    const css = `
      p {
        padding: 5px 0;
      }
      .input-textfield {
        flex-grow: 1;
      }
      .button-container {
        width: 100%;
        justify-content: flex-end;
      }
    `

    providerWindow.webContents.insertCSS(css)

    const html = `
      <div class="block my-content">
        <div class="inline-block">
          <label class="input-label">URL</label>
          <input class="input-textfield" name="url" value="${ provider ? provider.url : ""}" />
        </div>
        <div class="inline-block">
          <label class="input-label">Name</label>
          <input class="input-textfield" name="name" value="${ provider ? provider.name : ""}" />
        </div>
        <div class="inline-block button-container">
          <button class="button" onclick="window.close()">Cancel</button>
          <button class="button" onclick="window.onSave()">${ provider ? "Update" : "Add" }</button>
        </div>
      </div>
    `

    const code = `
      (function () {
        window.onSave = (event) => {
          const url = document.body.querySelector('input[name="url"]').value
          const name = document.body.querySelector('input[name="name"]').value
          if (url.trim().length > 0 && name.trim().length > 0) {
            window.jancyAPI.dispatchAction("example-proxy-provider:save", {
              url,
              name
            })
            window.close()
          }
        }
        document.body.innerHTML = \`${html}\`
      })()
    `

    providerWindow.on('close', () => {
      jancy.actionRegistry.unregister("example-proxy-provider:save")
    })

    providerWindow.webContents.executeJavaScript(code)
    providerWindow.show()
  })
}


module.exports = {
  
  jancy_props: {
    registryVersion: 1
  },

  /* --------------------------------------------------------------------------
  ** Called by the pluginRegistry when we are loaded.
  ** ------------------------------------------------------------------------*/
  jancy_onInit(jancy, enabled) {
    if (enabled) {
      this.jancy_onEnabled(jancy)
    }
  },

  /* --------------------------------------------------------------------------
  ** Called by the pluginRegistry when the user has enabled us and we
  ** were previously disabled.
  ** ------------------------------------------------------------------------*/
  jancy_onEnabled(jancy) {
    jancy.proxyProviderFactories.addFactory(ProxyProviderFactory)
  },

  /* --------------------------------------------------------------------------
  ** Called by the pluginRegistry when the user has disabled us and
  ** we were previously enabled.
  ** ------------------------------------------------------------------------*/
  jancy_onDisabled(jancy)  {
    jancy.proxyProviderFactories.removeFactory(ProxyProviderFactory.id)
  }
}
