import http from '../../utils/http';
import {store} from '../../App';
import {batch} from 'react-redux';
import {setConnectionStatus} from '../../actions/app';
import {getCurrentUser} from '../../actions/app/thunks';
import {getChats} from '../../actions/chats/thunks';
import {
  sendMessage,
  handleMessageRecieved,
  handleSendMessageAckRecieved,
} from './message';
import {handleUserTyping, handleChatsMarkedAsSeen} from './chat';

export let socket: WebSocket = null;
export let connected = false;
let pingInterval;
let lastPingId;
let reconnectInterval;
let isReconnect = false;

export const init = async () => {
  let {url}: {url: string} = await http({
    path: '/rtm.connect',
    method: 'POST',
  });

  socket = new WebSocket(url);

  socket.onopen = e => {
    console.log('[open] Connection established');
    connected = true;
    store.dispatch(setConnectionStatus('connected'));

    startPing();
    stopReconnect();

    if (isReconnect) {
      batch(() => {
        store.dispatch(getCurrentUser() as any);
        store.dispatch(getChats() as any);
      });
    }
  };

  socket.onmessage = ({data}) => {
    data = JSON.parse(data);

    if (data.type === 'hello') {
    }

    if (data.type === 'pong') {
      // reset for next ping when last ping was responded by server
      if (lastPingId === data.reply_to) {
        lastPingId = null;
      }

      return;
    }

    console.log(`[message] Data received from server:`, data);

    if (data.type === 'message') handleMessageRecieved(data);

    if (data.type === 'user_typing') handleUserTyping(data);

    // Chat was seen by current user.
    if (data.type === 'im_marked' || data.type === 'channel_marked')
      handleChatsMarkedAsSeen(data);

    // Handle server ack messages
    if (data.reply_to) {
      handleSendMessageAckRecieved(data);
    }
  };

  socket.onclose = event => {
    if (event.wasClean) {
      console.log(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`,
      );
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log('[close] Connection died');
    }
    store.dispatch(setConnectionStatus('disconnected'));
    connected = false;

    reconnect();
  };

  socket.onerror = error => {
    alert(`[error] ${error.message}`);
  };
};

export const closeSocket = () => {
  if (socket && connected) {
    stopPing();
    stopReconnect();
    socket.close();
  }
};

const startPing = () => {
  pingInterval = setInterval(() => {
    // If last ping did not get a response. close the socket.
    if (lastPingId) {
      closeSocket();
      return;
    }
    let message = sendMessage({type: 'ping'});
    lastPingId = message && message.id;
    // console.log('[socket] ping sent');
  }, 10000);
};

const stopPing = () => pingInterval && clearInterval(pingInterval);

const reconnect = () => {
  reconnectInterval = setInterval(() => {
    console.log('[socket] reconnecting...');
    init();
    isReconnect = true;
  }, 3000);
};

const stopReconnect = () =>
  reconnectInterval && clearInterval(reconnectInterval);

export * from './message';
export * from './chat';