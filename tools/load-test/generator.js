const axios = require("axios");

const API_ENDPOINT = "http://localhost:4000/track";
const USERS_TO_SIMULATE = 10;
const EVENTS_PER_SECOND_PER_USER = 2;

const paths = ["/", "/about", "/products/1", "/contact", "/pricing"];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function R(max) {
  return Math.floor(Math.random() * max);
}

async function sendEvent(cid) {
  const isClick = Math.random() > 0.3;
  const path = getRandomElement(paths);
  const pageW = 1920;
  const pageH = 1080;

  let event = {
    type: "page_view",
    cid: cid,
    ts: Date.now(),
    context: {
      url: `http://demo-site.com${path}`,
      path: path,
      host: "demo-site.com",
      pageW,
      pageH,
      screenW: 1920,
      screenH: 1080,
    },
    payload: {},
  };

  if (isClick) {
    event.type = "click";
    event.payload = {
      x: R(pageW),
      y: R(pageH),
      target: "DIV",
    };
  }

  try {
    await axios.post(API_ENDPOINT, event);
  } catch (e) {
    console.error("Error sending event", e.message);
  }
}

function startUser(cid) {
  console.log(`Starting user ${cid}`);
  setInterval(() => sendEvent(cid), 1000 / EVENTS_PER_SECOND_PER_USER);
}

console.log(`Starting load test with ${USERS_TO_SIMULATE} users...`);
for (let i = 0; i < USERS_TO_SIMULATE; i++) {
  startUser(`load_test_user_${i}`);
}
