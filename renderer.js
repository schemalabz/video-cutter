const { ipcRenderer } = require('electron');

let videoPath = null;
let videoDuration = 0;
let segments = [];

const selectBtn = document.getElementById('selectBtn');
const videoInfo = document.getElementById('videoInfo');
const videoSection = document.getElementById('videoSection');
const addSegmentBtn = document.getElementById('addSegmentBtn');
const segmentsDiv = document.getElementById('segments');
const noSegments = document.getElementById('noSegments');
const cutBtn = document.getElementById('cutBtn');
const statusDiv = document.getElementById('status');

// Format time for display (H:MM:SS)
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format time to H:MM:SS string (always includes hours, even if 0)
function formatTimeInput(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Parse time from input (supports H:MM:SS, MM:SS, or SS)
function parseTime(timeStr) {
  if (!timeStr) return 0;
  
  // Remove any whitespace
  timeStr = timeStr.trim();
  
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      // H:MM:SS format
      const [hours, mins, secs] = parts.map(Number);
      return (hours || 0) * 3600 + (mins || 0) * 60 + (secs || 0);
    } else if (parts.length === 2) {
      // MM:SS format (treat as minutes:seconds)
      const [mins, secs] = parts.map(Number);
      return (mins || 0) * 60 + (secs || 0);
    }
  }
  
  // Try parsing as plain number (seconds)
  const num = parseFloat(timeStr);
  return isNaN(num) ? 0 : num;
}

// Select video
selectBtn.addEventListener('click', async () => {
  const path = await ipcRenderer.invoke('select-video');
  if (path) {
    videoPath = path;
    const fileName = path.split('/').pop();
    
    // Show loading state
    videoInfo.innerHTML = `
      <div class="video-info-name">${fileName}</div>
      <div class="video-info-duration">⏳ Detecting...</div>
    `;
    videoInfo.style.display = 'block';
    videoSection.style.display = 'block';
    segments = [];
    renderSegments();
    
    // Auto-detect duration
    const durationResult = await ipcRenderer.invoke('get-video-duration', path);
    if (durationResult.success) {
      videoDuration = durationResult.duration;
      videoInfo.innerHTML = `
        <div class="video-info-name">${fileName}</div>
        <div class="video-info-duration">⏱️ ${formatTime(videoDuration)}</div>
      `;
    } else {
      videoInfo.innerHTML = `
        <div class="video-info-name">${fileName}</div>
        <div class="video-info-duration" style="color: #dc3545;">⚠️ Duration unknown</div>
      `;
    }
  }
});

// Add segment
addSegmentBtn.addEventListener('click', () => {
  const newSegment = {
    id: Date.now().toString(),
    start: '0:00:00',
    end: videoDuration > 0 ? formatTimeInput(videoDuration) : '0:00:10',
  };
  segments.push(newSegment);
  renderSegments();
  // Focus the start input of the new segment
  setTimeout(() => {
    const newInput = document.querySelector(`[data-segment-id="${newSegment.id}"][data-field="start"]`);
    if (newInput) {
      newInput.focus();
      newInput.select();
    }
  }, 10);
});

// Remove segment
function removeSegment(id) {
  segments = segments.filter(s => s.id !== id);
  renderSegments();
}

// Update segment (without re-rendering)
function updateSegment(id, field, value) {
  segments = segments.map(s => {
    if (s.id === id) {
      return { ...s, [field]: value };
    }
    return s;
  });
  // Update duration display without re-rendering the whole segment
  updateSegmentDuration(id);
}

// Update segment duration display only
function updateSegmentDuration(id) {
  const segment = segments.find(s => s.id === id);
  if (!segment) return;
  
  const start = parseTime(segment.start);
  const end = parseTime(segment.end);
  const duration = Math.max(0, end - start);
  
  // Find the duration element and update it
  const segmentElement = document.querySelector(`[data-segment-id="${id}"]`);
  if (segmentElement) {
    const durationElement = segmentElement.querySelector('.segment-duration');
    if (durationElement) {
      durationElement.textContent = formatTime(duration);
    }
  }
}

// Render segments
function renderSegments() {
  if (segments.length === 0) {
    segmentsDiv.innerHTML = '';
    noSegments.style.display = 'block';
    return;
  }

  noSegments.style.display = 'none';
  segmentsDiv.innerHTML = segments.map((segment, index) => {
    const start = parseTime(segment.start);
    const end = parseTime(segment.end);
    const duration = Math.max(0, end - start);
    
    // Use stored value (could be raw input or formatted), or format if empty
    const displayStart = segment.start || formatTimeInput(start);
    const displayEnd = segment.end || formatTimeInput(end);
    const maxEndTime = videoDuration > 0 ? formatTimeInput(videoDuration) : '0:00:10';
    
    return `
      <div class="segment" data-segment-id="${segment.id}">
        <div class="segment-header">
          <div class="segment-number">Segment ${index + 1}</div>
          <button class="btn-remove" onclick="removeSegment('${segment.id}')">Remove</button>
        </div>
        <div class="time-inputs">
          <div class="time-input-group">
            <label class="time-label">Start Time</label>
            <input 
              type="text" 
              class="time-input"
              data-segment-id="${segment.id}"
              data-field="start"
              value="${displayStart}" 
              placeholder="0:00:00">
          </div>
          <div class="time-input-group">
            <label class="time-label">End Time</label>
            <input 
              type="text" 
              class="time-input"
              data-segment-id="${segment.id}"
              data-field="end"
              value="${displayEnd}" 
              placeholder="${maxEndTime}">
          </div>
        </div>
        <div class="segment-duration">${formatTime(duration)}</div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners to inputs
  attachInputListeners();
}

// Attach input listeners to all time inputs
function attachInputListeners() {
  const inputs = document.querySelectorAll('.time-input');
  inputs.forEach(input => {
    // Remove existing listeners by cloning
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    // Add input listener (update without re-rendering)
    newInput.addEventListener('input', (e) => {
      const id = e.target.dataset.segmentId;
      const field = e.target.dataset.field;
      const value = e.target.value;
      updateSegment(id, field, value);
    });
    
    // Add blur listener (normalize format)
    newInput.addEventListener('blur', (e) => {
      const id = e.target.dataset.segmentId;
      const field = e.target.dataset.field;
      const parsed = parseTime(e.target.value);
      const normalized = formatTimeInput(parsed);
      e.target.value = normalized;
      updateSegment(id, field, normalized);
    });
  });
}

// Make functions globally available
window.removeSegment = removeSegment;

// Cut video
cutBtn.addEventListener('click', async () => {
  if (!videoPath) {
    showStatus('Please select a video file first', 'error');
    return;
  }

  if (segments.length === 0) {
    showStatus('Please add at least one segment to cut', 'error');
    return;
  }

  // Validate segments
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const start = parseTime(segment.start);
    const end = parseTime(segment.end);

    if (start >= end) {
      showStatus(`Segment ${i + 1}: Start time must be less than end time`, 'error');
      return;
    }

    if (end > videoDuration) {
      showStatus(`Segment ${i + 1}: End time exceeds video duration (${formatTime(videoDuration)})`, 'error');
      return;
    }
    
    // Normalize segment times to H:MM:SS format
    segments[i].start = formatTimeInput(start);
    segments[i].end = formatTimeInput(end);
  }

  cutBtn.disabled = true;
  cutBtn.innerHTML = '<span class="loading"></span> Processing...';
  statusDiv.innerHTML = '';

  try {
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const start = parseTime(segment.start);
      const end = parseTime(segment.end);

      showStatus(`Processing segment ${i + 1} of ${segments.length}...`, 'processing');
      
      const result = await ipcRenderer.invoke('cut-video', {
        inputPath: videoPath,
        startTime: start,
        endTime: end,
        segmentNumber: i + 1,
      });

      if (!result.success) {
        throw new Error(result.error);
      }
    }

    showStatus(`✅ Successfully created ${segments.length} video segment${segments.length > 1 ? 's' : ''}!`, 'success');
  } catch (error) {
    showStatus(`❌ Failed to process video: ${error.message}`, 'error');
  } finally {
    cutBtn.disabled = false;
    cutBtn.innerHTML = '✂️ Cut Video';
  }
});

// Show status message
function showStatus(message, type) {
  statusDiv.innerHTML = `<div class="status ${type}">${message}</div>`;
}
