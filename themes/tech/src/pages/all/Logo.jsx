import React from "react";

function Logo() {
  return (
    <div>
      <a href="/">
        <img style={{ height: "50px" }} src="/logo.png" alt="logo" />
      </a>
    </div>
  );
}

export default Logo;

export const layout = {
  areaId: "header",
  sortOrder: 5,
};
