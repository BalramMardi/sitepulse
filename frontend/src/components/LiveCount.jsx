import React from "react";

function LiveCount({ count }) {
  return (
    <div className="card">
      <h2>Live Users</h2>
      <strong style={{ fontSize: "2.5rem" }}>{count}</strong>
    </div>
  );
}

export default LiveCount;
