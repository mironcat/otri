import { boot } from 'quasar/wrappers'
import { SVG } from '@svgdotjs/svg.js'
import { EventBus } from 'quasar'
// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api
  const bus = new EventBus()
  // app.config.globalProperties.$draw = SVG
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file
  app.provide('svg', SVG())
  app.provide('bus', bus)
})

