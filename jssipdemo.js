/* 
 * How To Use:
 * 1. fill in valid credentials in the config below
 * 2. run the JsFiddle and enjoy
 */
 
 
var socket = new JsSIP.WebSocketInterface('wss://???.???.???.???:8089/ws'); // FILL WSS SERVER

var configuration = {
  sockets: [socket],
  'uri': '', // FILL SIP URI HERE like sip:sip-user@your-domain.bwapp.bwsip.io
  'password': '', // FILL PASSWORD HERE,
  'username': '',  // FILL USERNAME HERE
  'register': true
};

var incomingCallAudio = new window.Audio('https://code.bandwidth.com/media/incoming_alert.mp3');
incomingCallAudio.loop = true;
incomingCallAudio.crossOrigin="anonymous";
var remoteAudio = new window.Audio();
remoteAudio.autoplay = true;
remoteAudio.crossOrigin="anonymous";

var callOptions = {
  mediaConstraints: {audio: true, video: false}
};

var phone;
if(configuration.uri && configuration.password){
    JsSIP.debug.enable('JsSIP:*'); // more detailed debug output
    phone = new JsSIP.UA(configuration);
    phone.on('registrationFailed', function(ev){
    	alert('Registering on SIP server failed with error: ' + ev.cause);
      configuration.uri = null;
      configuration.password = null;
      updateUI();
    });
    phone.on('newRTCSession',function(ev){
        var newSession = ev.session;
        if(session){ // hangup any existing call
            session.terminate();
        }
        session = newSession;
        var completeSession = function(){
        		session = null;
          	updateUI();
        };
        session.on('ended', completeSession);
        session.on('failed', completeSession);
        session.on('accepted',updateUI);
        session.on('confirmed',function(){
        	var localStream = session.connection.getLocalStreams()[0];
          var dtmfSender = session.connection.createDTMFSender(localStream.getAudioTracks()[0])
          session.sendDTMF = function(tone){
            dtmfSender.insertDTMF(tone);
          };
          updateUI();
        });
        session.on('peerconnection', (e) => {
          console.log('peerconnection', e);
          let logError = '';
          const peerconnection = e.peerconnection;

          peerconnection.onaddstream = function (e) {
            console.log('addstream', e);
            // set remote audio stream (to listen to remote audio)
            // remoteAudio is <audio> element on pag
            remoteAudio.srcObject = e.stream;
            remoteAudio.play();
          };

          var remoteStream = new MediaStream();
          console.log(peerconnection.getReceivers());
          peerconnection.getReceivers().forEach(function (receiver) {
            console.log(receiver);
            remoteStream.addTrack(receiver.track);
          });
        });
      
        if(session.direction === 'incoming'){
        	incomingCallAudio.play();
        } else {
          console.log('con', session.connection)
          session.connection.addEventListener('addstream', function(e){
            incomingCallAudio.pause();
            remoteAudio.srcObject = e.stream;
          });      
        }
        updateUI();
    });
    phone.start();
}

var session;
updateUI();

$('#connectCall').click(function () {
    var dest = $('#toField').val();
    phone.call(dest, callOptions);
    updateUI();
});


$('#answer').click(function(){
    session.answer(callOptions);
});

var hangup = function(){
		session.terminate();
};

$('#hangUp').click(hangup);
$('#reject').click(hangup);

$('#mute').click(function(){
    console.log('MUTE CLICKED');
    if(session.isMuted().audio){
        session.unmute({audio: true});
    }else{
        session.mute({audio: true});   
    }
    updateUI();
});
$('#toField').keypress(function(e){
    if(e.which === 13){//enter
        $('#connectCall').click();
    }
});
$('#inCallButtons').on('click', '.dialpad-char', function (e) {
    var $target = $(e.target);
    var value = $target.data('value');
    session.sendDTMF(value.toString());
});
function updateUI(){
    if(configuration.uri && configuration.password){
        $('#errorMessage').hide();
        $('#wrapper').show();
        if(session){
            if(session.isInProgress()){
                if(session.direction === 'incoming'){
                    $('#incomingCallNumber').html(session.remote_identity.uri);
                    $('#incomingCall').show();
                    $('#callControl').hide()  
                    $('#incomingCall').show();
                }else{
                    $('#callInfoText').html('Ringing...');
                    $('#callInfoNumber').html(session.remote_identity.uri.user);
                    $('#callStatus').show();                   
                }
                
            }else if(session.isEstablished()){
                $('#callStatus').show();
                $('#incomingCall').hide();
                $('#callInfoText').html('In Call');
                $('#callInfoNumber').html(session.remote_identity.uri.user);
                $('#inCallButtons').show();
                incomingCallAudio.pause();
            }
            $('#callControl').hide();
        }else{
            $('#incomingCall').hide();
            $('#callControl').show();
            $('#callStatus').hide();
            $('#inCallButtons').hide();
            incomingCallAudio.pause();
        }
        //microphone mute icon
        if(session && session.isMuted().audio){
            $('#muteIcon').addClass('fa-microphone-slash');
            $('#muteIcon').removeClass('fa-microphone');
        }else{
            $('#muteIcon').removeClass('fa-microphone-slash');
            $('#muteIcon').addClass('fa-microphone');
        }
    }else{
        $('#wrapper').hide();
        $('#errorMessage').show();
    }
}