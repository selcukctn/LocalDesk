/**
 * WebRTC Screen Sharing Handler for Desktop
 * Handles screen capture and peer connections for remote screen feature
 */

// Active peer connections
const peerConnections = new Map(); // socketId -> RTCPeerConnection
const streams = new Map(); // socketId -> MediaStream

// ICE configuration
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

/**
 * Start screen capture and create WebRTC connection
 */
async function startScreenCapture({ socketId, offer, constraints }) {
  try {
    console.log('📹 Starting screen capture for socket:', socketId);
    console.log('📹 Offer received:', offer);
    console.log('📹 Offer type:', offer?.type);
    console.log('📹 Offer SDP (first 200 chars):', offer?.sdp?.substring(0, 200));
    console.log('📹 Constraints:', JSON.stringify(constraints, null, 2));

    // Get media stream with electron constraints
    console.log('📹 Requesting media stream...');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream obtained:', stream.id);
      console.log('✅ Tracks:', stream.getTracks().map(t => ({ kind: t.kind, id: t.id, enabled: t.enabled, readyState: t.readyState })));
    } catch (getUserMediaError) {
      console.error('❌ getUserMedia failed:', getUserMediaError);
      console.error('❌ Error name:', getUserMediaError.name);
      console.error('❌ Error message:', getUserMediaError.message);
      throw getUserMediaError;
    }

    streams.set(socketId, stream);

    // Create peer connection
    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections.set(socketId, pc);

    // Add stream tracks to peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
      console.log('📹 Added track to peer:', track.kind, track.id);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📹 ICE candidate generated');
        console.log('📹 Candidate:', event.candidate);
        
        if (window.webrtc && window.webrtc.sendIceCandidate) {
          // Convert to plain object for IPC
          const candidateObj = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          };
          console.log('📹 Sending ICE candidate to mobile');
          window.webrtc.sendIceCandidate(socketId, candidateObj);
          console.log('✅ ICE candidate sent');
        } else {
          console.error('❌ window.webrtc.sendIceCandidate not available');
          console.error('❌ window.webrtc:', window.webrtc);
        }
      } else {
        console.log('📹 ICE gathering completed (null candidate)');
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('📹 Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.warn('⚠️ Connection failed/disconnected');
        stopScreenCapture(socketId);
      } else if (pc.connectionState === 'connected') {
        console.log('✅ Peer connection established!');
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('📹 ICE connection state:', pc.iceConnectionState);
    };

    // Set remote description (offer from mobile)
    if (offer) {
      console.log('📹 Setting remote description (offer)');
      console.log('📹 Offer object:', { type: offer.type, sdpLength: offer.sdp?.length });
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('✅ Remote description set successfully');
      } catch (setRemoteError) {
        console.error('❌ setRemoteDescription failed:', setRemoteError);
        console.error('❌ Error name:', setRemoteError.name);
        console.error('❌ Error message:', setRemoteError.message);
        throw setRemoteError;
      }

      // Create answer
      console.log('📹 Creating answer...');
      let answer;
      try {
        answer = await pc.createAnswer();
        console.log('✅ Answer created:', { type: answer.type, sdpLength: answer.sdp?.length });
      } catch (createAnswerError) {
        console.error('❌ createAnswer failed:', createAnswerError);
        throw createAnswerError;
      }
      
      try {
        await pc.setLocalDescription(answer);
        console.log('✅ Local description set (answer)');
        console.log('📹 Answer SDP (first 200 chars):', answer.sdp?.substring(0, 200) + '...');
      } catch (setLocalError) {
        console.error('❌ setLocalDescription failed:', setLocalError);
        throw setLocalError;
      }

      // Send answer back to mobile
      console.log('📹 Preparing to send answer to mobile...');
      console.log('📹 Local description type:', pc.localDescription?.type);
      console.log('📹 Local description SDP length:', pc.localDescription?.sdp?.length);
      
      if (window.webrtc && window.webrtc.sendAnswer) {
        // Convert to plain object for IPC
        const answerObj = {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp
        };
        console.log('📹 Answer object prepared:', { type: answerObj.type, sdpLength: answerObj.sdp?.length });
        console.log('📹 Sending answer via window.webrtc.sendAnswer...');
        window.webrtc.sendAnswer(socketId, answerObj);
        console.log('✅ Answer sent successfully via IPC');
      } else {
        console.error('❌ window.webrtc.sendAnswer not available!');
        console.error('❌ window.webrtc:', window.webrtc);
        console.error('❌ window.webrtc.sendAnswer:', window.webrtc?.sendAnswer);
        throw new Error('window.webrtc.sendAnswer not available');
      }
    } else {
      console.error('❌ No offer provided!');
      throw new Error('No offer provided to startScreenCapture');
    }

    console.log('✅ WebRTC screen capture setup completed for socket:', socketId);
    updateUI();

  } catch (error) {
    console.error('❌ Screen capture error:', error);
    console.error('❌ Error stack:', error.stack);
    stopScreenCapture(socketId);
  }
}

/**
 * Stop screen capture and close peer connection
 */
function stopScreenCapture(socketId) {
  console.log('📹 Stopping screen capture for socket:', socketId);

  // Stop media stream
  const stream = streams.get(socketId);
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 Stopped track:', track.kind);
    });
    streams.delete(socketId);
  }

  // Close peer connection
  const pc = peerConnections.get(socketId);
  if (pc) {
    pc.close();
    peerConnections.delete(socketId);
  }

  console.log('✅ Screen capture stopped for socket:', socketId);
  updateUI();
}

/**
 * Handle incoming ICE candidate from mobile
 */
async function handleIceCandidate({ socketId, candidate }) {
  console.log('📹 handleIceCandidate called');
  console.log('📹 Socket ID:', socketId);
  console.log('📹 Candidate:', candidate);
  
  const pc = peerConnections.get(socketId);
  if (!pc) {
    console.error('❌ Peer connection not found for socket:', socketId);
    return;
  }
  
  if (candidate) {
    try {
      console.log('📹 Adding ICE candidate to peer connection');
      const iceCandidate = new RTCIceCandidate(candidate);
      await pc.addIceCandidate(iceCandidate);
      console.log('✅ ICE candidate added successfully');
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
      console.error('❌ Error details:', error.message);
    }
  } else {
    console.log('📹 Received empty ICE candidate (end of candidates)');
  }
}

/**
 * Update UI with active connections
 */
function updateUI() {
  const activeConnections = peerConnections.size;
  const statusEl = document.getElementById('remoteScreenStatus');
  
  if (statusEl) {
    if (activeConnections > 0) {
      statusEl.innerHTML = `
        <div class="remote-screen-badge active">
          <span class="badge-icon">🖥️</span>
          <span class="badge-text">Remote Screen Active (${activeConnections})</span>
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="remote-screen-badge inactive">
          <span class="badge-icon">🖥️</span>
          <span class="badge-text">Remote Screen Ready</span>
        </div>
      `;
    }
  }
}

/**
 * Initialize WebRTC handlers
 */
function initWebRTC() {
  console.log('📹 Initializing WebRTC handlers...');
  
  // Check if window.webrtc is available
  if (!window.webrtc) {
    console.error('❌ window.webrtc not available! WebRTC features will not work.');
    console.error('❌ This usually means preload.js is not loaded correctly.');
    return;
  }

  console.log('✅ window.webrtc API available');
  console.log('✅ window.webrtc methods:', Object.keys(window.webrtc));
  console.log('✅ window.webrtc.onStartScreenCapture:', typeof window.webrtc.onStartScreenCapture);
  console.log('✅ window.webrtc.sendAnswer:', typeof window.webrtc.sendAnswer);

  // Listen for screen capture start requests from main process
  window.webrtc.onStartScreenCapture((data) => {
    console.log('📹 Received start-screen-capture event from main process');
    console.log('📹 Event data:', data);
    try {
      startScreenCapture(data);
    } catch (error) {
      console.error('❌ Error in startScreenCapture:', error);
      console.error('❌ Stack:', error.stack);
    }
  });

  // Listen for answer from main process (not used - desktop creates answer)
  window.webrtc.onWebRTCAnswer(({ socketId, answer }) => {
    console.log('📹 Received webrtc-answer event (not used on desktop)');
  });

  // Listen for ICE candidates from main process
  window.webrtc.onWebRTCIceCandidate(({ socketId, candidate }) => {
    console.log('📹 Received ICE candidate from mobile');
    handleIceCandidate({ socketId, candidate });
  });

  // Listen for disconnect events
  window.webrtc.onWebRTCDisconnect(({ socketId }) => {
    console.log('📹 Received disconnect event for socket:', socketId);
    stopScreenCapture(socketId);
  });

  // Initial UI update
  updateUI();

  console.log('✅ WebRTC handlers initialized successfully');
}

// Auto-initialize when DOM is ready and window.webrtc is available
function tryInitWebRTC() {
  if (window.webrtc) {
    console.log('✅ window.webrtc detected, initializing...');
    initWebRTC();
  } else {
    console.warn('⚠️ window.webrtc not yet available, retrying in 100ms...');
    setTimeout(tryInitWebRTC, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitWebRTC);
} else {
  tryInitWebRTC();
}

