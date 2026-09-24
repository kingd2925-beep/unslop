// The preview helper. Pages run their own scripts only inside a sandboxed preview frame that
// cannot touch the editor. A small helper script reports back two things through postMessage:
// the styles the page generated at runtime (Tailwind CDN, CSS-in-JS) and link clicks, so
// "Preview -> click a page link" can switch pages.

const PROBE_DELAY_MS = 600;

function helperScript(token) {
  const tokenJson = JSON.stringify(token);
  return `<script data-unslop-probe>(function(){
var TOKEN=${tokenJson};
function post(msg){msg.unslop=TOKEN;parent.postMessage(msg,'*');}
function snapshot(){
var styles=[],list=document.querySelectorAll('style'),i;
for(i=0;i<list.length;i++){styles.push(list[i].textContent||'');}
var clone=document.documentElement.cloneNode(true);
var own=clone.querySelectorAll('script[data-unslop-probe]');
for(i=0;i<own.length;i++){own[i].parentNode.removeChild(own[i]);}
post({type:'probe',styles:styles,text:(document.body?document.body.innerText:'').trim().length,html:clone.outerHTML});
}
function later(){setTimeout(snapshot,${PROBE_DELAY_MS});}
if(document.readyState==='complete'){later();}else{window.addEventListener('load',later);}
document.addEventListener('click',function(e){
var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;
if(!a){return;}
var href=a.getAttribute('href')||'';
if(href.charAt(0)==='#'){return;}
e.preventDefault();
post({type:'nav',href:href});
},true);
})();<\/script>`;
}

/** The page HTML with the helper inserted before the closing body tag (or at the end). */
export function buildPreviewHtml(html, token) {
  const helper = helperScript(token);
  const at = html.toLowerCase().lastIndexOf('</body>');
  if (at === -1) return html + helper;
  return html.slice(0, at) + helper + html.slice(at);
}

/** CSS the page created while running: rendered style texts that were not in the source. */
export function runtimeStyles(originalStyles, renderedStyles) {
  const original = new Set(originalStyles);
  return renderedStyles.filter((css) => css.trim() && !original.has(css)).join('\n');
}

export { PROBE_DELAY_MS };
