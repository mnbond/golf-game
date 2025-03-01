# Golf game

A small JavaScript golf game ⛳. View demo here: [codepen.io](https://codepen.io/mnbond/full/VYwmVPX).

## Instructions

1. Add JavaScript code containing class `Golf` in an HTML document:

    ```html
    <script src="js/golf.js" type="text/javascript"></script>
    ```

2. Add HTML element for the game in `body` section:

    ```html
    <div id="golf-container"></div>
    ```

3. Сreate an instance of class `Golf` after the `DOMContentLoaded` event:

    ```js
    document.addEventListener("DOMContentLoaded", () => {
        golf = new Golf("golf-container", 35, 20);
    });
    ```

    Class `Golf` constructor parameters:
    - `containerId` — ID of HTML element for the game;
    - `cellSizePx` — size of cell in pixels, default 35 pixels;
    - `speedMs` — frame duration in milliseconds, default 20 milliseconds.