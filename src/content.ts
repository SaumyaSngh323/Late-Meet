(() => {
  const COPILOT_PREFIX = '[LateMeet]';

  const SELECTORS = {
    chatToggleButtons: [
      'button[aria-label*="Chat"]',
      'button[data-panel-id="chat-pane"]',
      'button[jsname][aria-label*="chat"]'
    ],
    chatInput: [
      'textarea[aria-label="Chat text input"]',
      'textarea[name="chatTextInput"]',
      'div[contenteditable="true"][aria-label*="message"]',
      'textarea[placeholder*="message"]'
    ],
    sendButton: [
      'button[aria-label="Send message"]',
      'button[data-tooltip="Send message"]',
      'button[jsname][aria-label*="Send"]'
    ],
    participantNodes: [
      '[data-participant-id] [data-self-name]',
      '[data-participant-id] [role="heading"]',
      '[data-participant-id] [aria-label]',
      '[data-self-name]', // The tile for the local user
      'div[jsname="NfX98"]', // Common class for names on video tiles
      '[aria-label^="Participant:"]' // Tile aria-labels
    ],
    showEveryoneBtn: '[aria-label*="Show everyone"]'
  };
  
  const MAX_PARTICIPANT_NAME_LEN = 120;

  function queryFirst(selectors: string[], root: Document | HTMLElement = document): HTMLElement | null {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      if (el) return el as HTMLElement;
    }
    return null;
  }

  function getTextValue(el: HTMLElement | null): string {
    if (!el) return '';
    if ('value' in el) return String((el as HTMLInputElement).value || '').trim();
    return String(el.textContent || '').trim();
  }

  function setInputValue(el: HTMLElement, value: string) {
    el.focus();
    try {
      document.execCommand('selectAll', false, undefined);
      document.execCommand('insertText', false, value);
    } catch (e) {
      console.warn(`${COPILOT_PREFIX} execCommand failed, falling back to property set`, e);
      if ('value' in el) {
        (el as HTMLInputElement).value = value;
      } else {
        el.textContent = value;
      }
    }
    
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function wait(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  async function findChatInputWithRetry(attempts = 6): Promise<HTMLElement | null> {
    for (let i = 0; i < attempts; i += 1) {
      const input = queryFirst(SELECTORS.chatInput);
      if (input) return input;
      await wait(300);
    }
    return null;
  }

  async function ensureChatPanelOpen(): Promise<HTMLElement | null> {
    const existingInput = queryFirst(SELECTORS.chatInput);
    if (existingInput) return existingInput;

    const chatToggle = queryFirst(SELECTORS.chatToggleButtons);
    if (chatToggle) {
      chatToggle.click();
      await wait(500);
      return findChatInputWithRetry(10);
    }

    return null;
  }

  async function sendChatMessage(message: string): Promise<boolean> {
    console.log(`${COPILOT_PREFIX} Attempting to send chat message.`);

    try {
      const chatInput = await ensureChatPanelOpen();
      if (!chatInput) {
        console.error(`${COPILOT_PREFIX} Could not find chat input box.`);
        return false;
      }

      setInputValue(chatInput, message);
      await wait(150);

      const sendButton = queryFirst(SELECTORS.sendButton) as HTMLButtonElement | null;
      if (sendButton && !sendButton.disabled && sendButton.getAttribute('aria-disabled') !== 'true') {
        sendButton.click();
      } else {
        chatInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          bubbles: true
        }));
      }

      console.log(`${COPILOT_PREFIX} Chat message send attempted.`);
      return true;
    } catch (err) {
      console.error(`${COPILOT_PREFIX} Error sending chat message:`, err);
      return false;
    }
  }

  function upsertBriefOverlay(briefContent: string, targetName?: string) {
    const overlayId = 'late-meet-brief-overlay';
    let overlay = document.getElementById(overlayId);

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      Object.assign(overlay.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        maxWidth: '360px',
        zIndex: '2147483647',
        background: 'rgba(0,0,0,0.9)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '12px',
        padding: '12px',
        fontFamily: 'Inter, Arial, sans-serif',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
      });
      document.body.appendChild(overlay);
    }

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.marginBottom = '6px';
    title.textContent = targetName ? `Brief for ${targetName}` : 'Meeting brief';

    const body = document.createElement('div');
    body.style.fontSize = '13px';
    body.style.lineHeight = '1.4';
    body.textContent = String(briefContent || 'No brief content available.');

    overlay.replaceChildren(title, body);

    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 8000);
  }

  function collectParticipants(): string[] {
    const names = new Set(['You']);

    for (const selector of SELECTORS.participantNodes) {
      document.querySelectorAll(selector).forEach(node => {
        const label = node.getAttribute('aria-label');
        const cleanLabel = label ? label.replace(/^Participant:\s*/, '') : null;
        const text = (cleanLabel || getTextValue(node as HTMLElement)).trim();
        
        if (text && text.length < MAX_PARTICIPANT_NAME_LEN && !text.includes('…')) {
          if (!['Meeting host', 'You', 'Presentation', 'Muted', 'Audio on'].includes(text)) {
            names.add(text);
          }
        }
      });
    }

    const selfNode = document.querySelector('[data-self-name]');
    if (selfNode) {
      const selfName = selfNode.getAttribute('data-self-name');
      if (selfName) names.add(selfName);
    }

    return [...names].filter(n => n.length > 0);
  }

  let participantPollTimer: number | NodeJS.Timeout | null = null;

  function startParticipantPolling() {
    if (participantPollTimer) return;

    participantPollTimer = setInterval(async () => {
      const participants = collectParticipants();

      try {
        await chrome.runtime.sendMessage({
          type: 'PARTICIPANTS_UPDATED',
          participants
        });
      } catch {
        // Service worker idle
      }
    }, 5000);
  }

  function injectFloatingButton() {
    const existing = document.getElementById('late-meet-floating-btn');
    if (existing) return;

    const btn = document.createElement('button');
    btn.id = 'late-meet-floating-btn';
    btn.innerHTML = `
      <span class="late-meet-btn-icon">🎙️</span>
      <span class="late-meet-btn-text">Start Copilot</span>
    `;
    
    Object.assign(btn.style, {
      position: 'fixed',
      left: '24px',
      bottom: '80px',
      zIndex: '10000',
      padding: '12px 20px',
      background: '#000',
      color: '#fff',
      border: '1px solid #333',
      borderRadius: '30px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'Inter, sans-serif',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      transition: 'all 0.2s ease'
    });

    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.borderColor = '#555';
    });

    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.borderColor = '#333';
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const textSpan = btn.querySelector('.late-meet-btn-text');
      if (textSpan) textSpan.textContent = 'Opening Copilot...';
      
      try {
        // Open the side panel (dashboard) where tabCapture can be properly initiated
        // with user gesture context. Content scripts cannot use chrome.tabCapture.
        await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        btn.style.display = 'none';
      } catch (err) {
        console.error(`${COPILOT_PREFIX} Error opening side panel:`, err);
        btn.disabled = false;
        if (textSpan) textSpan.textContent = 'Start Copilot';
      }
    });

    document.body.appendChild(btn);
  }

  const observer = new MutationObserver(() => {
    if (window.location.pathname.length > 5 && !window.location.pathname.includes('/_')) {
      injectFloatingButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'SHOW_BRIEF') {
      upsertBriefOverlay(message.briefContent, message.targetName);
      sendResponse({ success: true });
      return false;
    }

    if (message?.type === 'SEND_CHAT_MESSAGE') {
      sendChatMessage(message.text).then(success => sendResponse({ success }));
      return true;
    }

    if (message?.type === 'STATE_UPDATE') {
      const btn = document.getElementById('late-meet-floating-btn');
      if (btn && message.state.isActive) {
        btn.style.display = 'none';
      } else if (btn && !message.state.isActive) {
        btn.style.display = 'flex';
      }
      sendResponse({ success: true });
      return false;
    }

    // Don't handle unknown messages — let other listeners process them
    return false;
  });

  startParticipantPolling();
  if (window.location.pathname.length > 5 && !window.location.pathname.includes('/_')) {
    injectFloatingButton();
  }
})();
