import React, { useState, useEffect } from "react";
import { socket } from "./services/socket";
import LiveCount from "./components/LiveCount";
import TopPages from "./components/TopPages";
import HeatmapCanvas from "./components/HeatmapCanvas";

function App() {
  const [analytics, setAnalytics] = useState({ liveCount: 0, topPages: [] });
  const [clicks, setClicks] = useState([]);

  useEffect(() => {
    function onAnalyticsUpdate(value) {
      setAnalytics(value);
    }

    function onNewClick(value) {
      setClicks((prevClicks) => [...prevClicks.slice(-100), value]);
    }

    socket.on("analytics-update", onAnalyticsUpdate);
    socket.on("new-click", onNewClick);

    return () => {
      socket.off("analytics-update", onAnalyticsUpdate);
      socket.off("new-click", onNewClick);
    };
  }, []);

  return (
    <>
      <div className="header card">
        <h1>Real-time Analytics Dashboard</h1>
      </div>
      <div className="sidebar">
        <LiveCount count={analytics.liveCount} />
        <TopPages pages={analytics.topPages} />
      </div>
      <div className="main card">
        <h2>Live Click Heatmap</h2>
        <HeatmapCanvas clicks={clicks} />
      </div>
    </>
  );
}

export default App;
