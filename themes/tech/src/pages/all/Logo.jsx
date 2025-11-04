import React from "react";

function Logo() {
  return (
    <div>
      <a href="/">
        <img src="/logo.png" alt="logo" />
      </a>
    </div>
  );
}

export default Logo;

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
