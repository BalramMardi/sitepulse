import React, { useRef, useEffect } from "react";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function HeatmapCanvas({ clicks }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";

    clicks.forEach((click) => {
      const { payload, context } = click;

      const clickX = payload.x;
      const clickY = payload.y;
      const pageW = context.pageW || CANVAS_WIDTH;
      const pageH = context.pageH || CANVAS_HEIGHT;

      const drawX = (clickX / pageW) * CANVAS_WIDTH;
      const drawY = (clickY / pageH) * CANVAS_HEIGHT;

      ctx.beginPath();
      ctx.arc(drawX, drawY, 15, 0, 2 * Math.PI, false);
      ctx.fill();
    });
  }, [clicks]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        border: "1px solid #ccc",
        background: "#fafafa",
        width: "100%",
        height: "auto",
      }}
    />
  );
}

export default HeatmapCanvas;
