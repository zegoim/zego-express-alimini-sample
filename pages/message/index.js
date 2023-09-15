import {
  getTokenAndUserID
} from '../../utils/server';
import {
  format
} from '../../utils/util';
import {
  initSDK,
  authCheck,
  startPush,
  republish,
  logoutRoom
} from '../../utils/common';

let {
  zegoAppID,
  server,
  signature,
  serverUrl,
  bizName,
  subBiz
} = getApp().globalData;
let zg;
Page({
  data: {
    rtcroom: {
      roomId: "",
      token: "",
      userId: "1234567889889829",
      signature: signature,
      autoplay: true,
      enableCamera: false,
      resolution: 1,
      fps: 30,
      record: false,
      minBitrate: "",
      maxBitrate: "",
      extraInfo: {
        "bizName": bizName,
        "subBiz": subBiz,
        "isAliPay": true,
        rtmpPushUrl: "",
        serverUrl: serverUrl,
        rtmpPullUrl: ""
      },
      mute: false,
    },
    roomID: '', // 房间ID
    token: '', // 服务端校验token
    pullStreamID: '',
    pushStreamID: 'xcx-streamID-' + new Date().getTime(), // 推流ID
    userID: '', // 用户ID,
    connectType: -1, // -1为初始状态，1为连接，0断开连接
    handupStop: false,
    canShow: -1,
    scrollToView: "",
    needRepublish: false,
    brokenTime: 0,
    messageList: [],
    inputMessage: "",
    roomUserList: [],
    showRtcroom: false,
    pullList: []
  },
  async bindCallback() {
    zg.on('playerStateUpdate', (result) => {
      console.log('playStateUpdate', result);
    });
    zg.on('publisherStateUpdate', (result) => {
      console.log('publishStateChange', result);
    });
    zg.on('IMRecvBroadcastMessage', (roomID, chatData) => {
      console.log('IMRecvBroadcastMessage', roomID, chatData);
      let message = {
        ID: 'zego' + chatData[0].fromUser.userID + chatData[0].sendTime,
        name: chatData[0].fromUser.userName,
        // @ts-ignore
        time: format(chatData[0].sendTime),
        content: chatData[0].message + '(广播发送)'
      }
      this.setData({
        messageList: [...this.data.messageList, message],
        scrollToView: message.ID,
      });
    });
    zg.on('IMRecvCustomCommand', (roomID, fromUser, command) => {
      console.log('IMRecvCustomCommand', roomID, fromUser, command);
      let message = {
        ID: fromUser.userID,
        name: fromUser.userName,
        time: format(new Date().getTime()),
        content: command + '(自定义发送)'
      }
      this.setData({
        messageList: [...this.data.messageList, message],
        scrollToView: message.ID,
      });
    });
    zg.on('roomExtraInfoUpdate', (roomID, roomExtraInfoList) => {
      console.error('roomExtraInfoUpdate', roomID, roomExtraInfoList);
    })
    zg.on('IMRecvBarrageMessage', (roomID, chatData) => {
      console.log('IMRecvBroadcastMessage', roomID, chatData);
      let message = {
        ID: 'zego' + chatData[0].fromUser.userID + chatData[0].sendTime,
        name: chatData[0].fromUser.userName,
        // @ts-ignore
        time: format(chatData[0].sendTime),
        content: chatData[0].message + '(弹幕发送)'
      }
      this.setData({
        messageList: [...this.data.messageList, message],
        scrollToView: message.ID,
      });
    });
    zg.on('streamExtraInfoUpdate', (roomID, streamList) => {
      console.log('streamExtraInfoUpdate', roomID, streamList);
      let _content = '';
      streamList.forEach(item => {
        _content += `${item.user.userID} set stream ${item.streamID} extraInfo ${item.extraInfo} \n`;
      })
      my.alert({
        title: '流附加消息',
        content: _content,
      })
    });

  },
  bindKeyInput(e) {
    this.setData({
      roomID: e.detail.value,
    })
  },
  bindMessageInput(e) {
    this.setData({
      inputMessage: e.detail.value
    })
  },
  async sendMsg() {
    let message = {
      ID: this.data.userID + new Date().getTime(),
      name: this.data.userID,
      // @ts-ignore
      time: new Date().format("hh:mm:ss"),
      content: this.data.inputMessage,
    };
    console.log('>>> currentMessage', this.data.inputMessage);
    this.setData({
      messageList: [...this.data.messageList, message],
      scrollToView: message.ID,
    });
    try {
      const isSent = await zg.sendBroadcastMessage(this.data.roomID, this.data.inputMessage)
      console.log('>>> sendMsg success, ', isSent);
    } catch (error) {
      console.log('>>> sendMsg, error: ', error);
    };
  },
  async sendBarrageMsg() {
    let message = {
      ID: this.data.userID + new Date().getTime(),
      name: this.data.userID,
      // @ts-ignore
      time: new Date().format("hh:mm:ss"),
      content: this.data.inputMessage,
    };
    console.log('>>> barrageMessage', this.data.inputMessage);
    this.setData({
      messageList: [...this.data.messageList, message],
      scrollToView: message.ID,
    });
    try {
      const isSent = await zg.sendBarrageMessage(this.data.roomID, this.data.inputMessage)
      console.log('>>> barrageMessage success, ', isSent);
    } catch (error) {
      console.log('>>> barrageMessage, error: ', error);
    };
  },
  updateStreamExtra() {
    zg.setStreamExtraInfo(this.data.pushStreamID, 'setStreamExtraInfo test, send at ' + new Date().toLocaleString())
  },
  setRoomExtraInfo() {
    zg.setRoomExtraInfo(this.data.roomID, '2', 'ReliableMessage test002')
  },
  async sendCustomCommand() {
    console.error(this.data.roomUserList);
    console.error("sendCustomCommand");

    const toUserList = this.data.roomUserList.map(item => {
      return item.userID
    });
    try {
      const res = await zg.sendCustomCommand(this.data.roomID, this.data.inputMessage, toUserList);
      console.warn('send custom success ' + res)
    } catch (error) {
      console.error(JSON.stringify(error))
    }
  },
  async openRoom(e) {
    if (!this.data.roomID) {
      my.alert({
        title: '提示',
        content: '请输入房间号',
      });
      return;
    }
    if (this.data.connectType !== 1) {

      try {
        /** 获取token, userID */
        const res = getTokenAndUserID();
        if (!res) {
          console.error("userID and Token haven't been set.")
          return;
        }
        this.setData({
          token: res.token,
          userID: res.userID
        });
        let isLogin = await zg.loginRoom(this.data.roomID, this.data.token, {
          userID: this.data.userID,
          userName: 'nick' + this.data.userID
        }, {
          userUpdate: true
        });
        isLogin ? console.log('login success') : console.error('login fail');

        this.setData({
          isRelogin: true,
          connectType: 1,
        });
      } catch (error) {
        console.error('error: ', error);
        return;
      }
    }
    // 创建房间，开始推流
    if (e.target.dataset && e.target.dataset.role == 1 && this.data.rtcroom.extraInfo.rtmpPullUrl === '') {
      startPush(this);
    }
    this.setData({
      role: e.target.dataset.role
    })

  },
  logout() {
    try {
      const rtcroom = this.data.rtcroom;
      const pushStreamID = this.data.pushStreamID;
      const pullStreamID = this.data.pullStreamID;
      if (rtcroom.extraInfo.rtmpPushUrl) {
        zg.stopPublishingStream(pushStreamID);
        rtcroom.extraInfo.rtmpPushUrl = ""
      }
      if (rtcroom.extraInfo.rtmpPullUrl) {
        zg.stopPlayingStream(pullStreamID);
        rtcroom.extraInfo.rtmpPullUrl = ""
      }
      this.setData({
        rtcroom: rtcroom,
        roomUserList: [],
        pullStreamID: "",
        showRtcroom: false,
      })
      /** 登出房间 */
      if (zg && this.data.connectType === 1) zg.logoutRoom(this.data.roomID);
    } catch (error) {
      console.error('error: ', error);
    }
  },
  onError(e) {
    console.error("onError, e=" + JSON.stringify(e));
  },

  onRoomInfo(e) {
    console.warn("onRoomInfo, e=" + JSON.stringify(e));
  },

  onParticipantEnter(e) {
    console.warn("onParticipantEnter, e=" + JSON.stringify(e));
  },

  onParticipantLeave(e) {
    console.warn("onParticipantLeave, e=" + JSON.stringify(e));
  },

  onAudioPlayoutMode(e) {
    console.warn("onAudioPlayoutMode, e=" + JSON.stringify(e));
  },


  onReceiveRecordId(e) {
    console.warn("onReceiveRecordId, e=" + JSON.stringify(e));
  },

  onFirstRender(e) {
    console.warn("onFirstRender, e=" + JSON.stringify(e));
  },

  onRenderStop(e) {
    console.warn("onRenderStop, e=" + JSON.stringify(e));
  },
  // 更新推拉流状态
  onRtmpEvent(e) {
    console.warn("onRtmpEvent, e=" + JSON.stringify(e));
    if ([3800, 3801].includes(e.detail.code)) {
      zg.updatePlayerState(this.data.pushStreamID, e);
    } else if ([3802, 3803].includes(e.detail.code)) {
      zg.updatePlayerState(this.data.pullStreamID, e);
    }
  },
  async onReady() {
    zg = initSDK(this);
    console.log("message sdk version: ", zg.getVersion());
    console.log(zg);
    zg && this.bindCallback();
  },
  async reLogin() {
    try {
      await zg.logoutRoom();
      let isLogin = await zg.loginRoom(this.data.roomID, this.data.token, {
        userID: this.data.userID,
        userName: 'nick' + this.data.userID
      }, {
        userUpdate: true
      });
      isLogin ? console.log('login success') : console.error('login fail');
      this.setData({
        connectType: 1,
        roomUserList: [],
        isRelogin: true,
      });
      console.log('pushStream: ', this.data.pushStreamID, this.data.rtcroom.extraInfo.rtmpPushUrl);
      republish(this)
    } catch (error) {
      console.error('error: ', error);
    }
  },
  onShow() {
    console.log('server: ', server);
    authCheck(this);
    // if (zg && this.data.roomID) {
    //   this.reLogin();
    // }
    // 刷新全局变量
    zegoAppID = getApp().globalData.zegoAppID;
    server = getApp().globalData.server;
  },
  onHide() {
  },
  onUnload() {
    this.logout();
    my.offNetworkStatusChange()
  },
  onLoad() {
    // 监听网络状态
    this.onNetworkStatus();
  },
  onNetworkStatus() {

    my.onNetworkStatusChange(res => {
      console.warn("网络变化", res.isConnected, this.data.connectType === 1)
      if (res.isConnected) {
        this.handleShowrtcRoom()
        const time = (Date.now() - this.data.brokenTime)/ 1000;
        this.setData({
          needRepublish: time < 300 && time > 85
        })
      } else {
        this.setData({
          brokenTime: Date.now()
        })
      }
      if (res.isConnected && this.data.connectType === 1 && zg) {
        console.warn('data', this.data);
        console.warn('roomID', this.data.roomID);
        this.reLogin();
      }
    })
  },
});