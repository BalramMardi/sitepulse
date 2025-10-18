import React from "react";

function TopPages({ pages }) {
  return (
    <div className="card">
      <h2>Top Pages</h2>
      <ul>
        {pages.map((page) => (
          <li key={page.path}>
            {page.path}: <strong>{page.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopPages;
