/** Start by default, with a one-time user-activation fallback for browser policy. */
const player=document.getElementById('music-player');
if(player){
  let pending=true;
  function stopWaiting(){
    pending=false;
    document.removeEventListener('click',resume,true);
    document.removeEventListener('keydown',resume,true);
  }
  function resume(event){
    if(!pending||!event.isTrusted)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    stopWaiting();
    // Let the native player's own controls handle their first click.
    if(event.composedPath().includes(player))return;
    player.play().catch(()=>{});
  }
  player.addEventListener('play',stopWaiting,{once:true});
  document.addEventListener('click',resume,true);
  document.addEventListener('keydown',resume,true);
  player.play().catch(()=>{});
}
