import AgoraRTC from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState } from "react";
import { Button, Space, message, Typography, App } from "antd";
import { showJoinedMessage, createMicrophoneAudioTrack, createCameraVideoTrack } from "@/utils/utils";
import { useUrlQuery, useUnMount } from "@/utils/hooks";
import JoinForm from "@/components/JoinForm";
import AgoraVideoPlayer from "@/components/VideoPlayer";
import NetworkTestDialog from "@/components/NetworkTestDialog";
import MediaDeviceTest from "@/components/MediaDeviceTest";
const {
  Title
} = Typography;
const client = AgoraRTC.createClient({
  mode: "rtc",
  codec: "vp8"
});
function RecordingDeviceControl() {
  const formRef = useRef();
  const mediaDeviceRef = useRef();
  const networkTestRef = useRef();
  useUrlQuery(formRef);
  const [joined, setJoined] = useState(false);
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const [options, setOptions] = useState({});
  const [localUid, setLocalUid] = useState("");
  const {
    message
  } = App.useApp();
  const initTracks = async () => {
    const tracks = await Promise.all([createMicrophoneAudioTrack(), createCameraVideoTrack()]);
    setAudioTrack(tracks[0]);
    setVideoTrack(tracks[1]);
    return tracks;
  };
  useEffect(() => {
    initTracks();
    mediaDeviceRef.current.show();
  }, []);
  useUnMount(() => {
    if (joined) {
      leave();
    }
  });

  /*
   * Add the local use to a remote channel.
   *
   * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
   * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
   */
  const subscribe = async (user, mediaType) => {
    await client.subscribe(user, mediaType);
  };

  /*
   * Add a user who has subscribed to the live channel to the local interface.
   *
   * @param  {IAgoraRTCRemoteUser} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to add.
   * @param {trackMediaType - The {@link https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/itrack.html#trackmediatype | media type} to add.
   */
  const handleUserPublished = async (user, mediaType) => {
    const id = user.uid;
    await subscribe(user, mediaType);
    setRemoteUsers(prev => ({
      ...prev,
      [id]: user
    }));
  };

  /*
  * Remove the user specified from the channel in the local interface.
  *
  * @param  {string} user - The {@link  https://docs.agora.io/en/Voice/API%20Reference/web_ng/interfaces/iagorartcremoteuser.html| remote user} to remove.
  */
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === 'video') {
      const id = user.uid;
      setRemoteUsers(pre => {
        delete pre[id];
        return {
          ...pre
        };
      });
    }
  };
  const join = async () => {
    try {
      const options = formRef.current.getValue();
      setOptions(options);
      // Add event listeners to the client.
      client.on("user-published", handleUserPublished);
      client.on("user-unpublished", handleUserUnpublished);
      // Join a channel
      options.uid = await client.join(options.appId, options.channel, options.token || null, options.uid || null);
      setLocalUid(options.uid);
      let tracks = [];
      if (audioTrack && videoTrack) {
        tracks = [audioTrack, videoTrack];
      } else {
        tracks = await initTracks();
      }
      await client.publish(tracks);
      showJoinedMessage(message, options);
      setJoined(true);
    } catch (error) {
      message.error(error.message);
      console.error(error);
    }
  };
  const leave = async () => {
    audioTrack?.close();
    setAudioTrack(null);
    videoTrack?.close();
    setVideoTrack(null);
    setRemoteUsers({});
    await client?.leave();
    setJoined(false);
    const msg = "client leaves channel success!";
    message.success(msg);
  };
  const startNetworkTest = () => {
    networkTestRef.current.show();
  };
  return <div className="padding-20">
    <JoinForm ref={formRef}></JoinForm>
    <Space style={{
      marginTop: "10px"
    }}>
      <Button type="primary" onClick={join} disabled={joined}>Join</Button>
      <Button onClick={leave} disabled={!joined}>Leave</Button>
      <Button type="primary" disabled={!joined} onClick={startNetworkTest}>Start Network Test</Button>
    </Space>
    <MediaDeviceTest ref={mediaDeviceRef} videoTrack={videoTrack} audioTrack={audioTrack}></MediaDeviceTest>
    <NetworkTestDialog ref={networkTestRef} options={options}></NetworkTestDialog>
    {joined ? <div className="mt-10">
      <Title level={4}>Local User</Title>
      <div className="mt-10 mb-10">uid: {localUid}</div>
      <AgoraVideoPlayer videoTrack={videoTrack} audioTrack={audioTrack}></AgoraVideoPlayer>
    </div> : null}
    {Object.keys(remoteUsers).length ? <div className="mt-10">
        <Title level={4}>Remote Users</Title>
        {Object.keys(remoteUsers).map(id => <AgoraVideoPlayer videoTrack={remoteUsers[id]?.videoTrack} audioTrack={remoteUsers[id]?.audioTrack} text={`uid: ${id}`} key={id}></AgoraVideoPlayer>)}
      </div> : null}
  </div>;
}
export default RecordingDeviceControl;