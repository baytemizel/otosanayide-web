/** The Next app set poweredByHeader:false; this repo has no server routes beyond page rendering. */
export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', response => {
    if (response.headers) delete response.headers['x-powered-by'];
  });
  nitroApp.hooks.hook('beforeResponse', event => {
    removeResponseHeader(event, 'x-powered-by');
  });
});
