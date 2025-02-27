class Cell {
    constructor(col, row, type, isFinish) {
        this.position = {col: col, row: row};
        this.type = type;
        this.isFinish = isFinish;
    }
}

class Golf {
    constructor(containerId, cellSizePx=35, speedMs=20) {
        // Set properties
        this.setDefaultProperties();
        this.ballsOnLevel = 5;
        this.cellSizePx = cellSizePx;
        this.container = document.getElementById(containerId);
        this.speedMs = speedMs;
        this.visibleCellsCount = 100;
        
        // Set events
        this.setEvents();
        
        this.createCanvas();
        this.loadLevel(1);
    }
    
    animationJumpStart(colShift, rowShift, isCorrectJump, callback) {
        const animation = this.animations.jump;
        const shift = Math.max(Math.abs(colShift), Math.abs(rowShift));
        
        // Set animation properties
        animation.callback = callback;
        animation.currentFrame = 0;
        animation.inProgress = true;
        animation.isCorrectJump = isCorrectJump;
        animation.positionShift.col = colShift;
        animation.positionShift.row = rowShift;
        
        // Calc properties
        animation.frames = 30 + shift * 10;
        animation.firstJumpHeight = 1 + shift * 2;
        animation.secondJumpHeight = 0.5;
        animation.firstJumpDurationPct = (isCorrectJump ? Math.max(1 - 10 / animation.frames, 1 - 1 / (2 * shift)) : 1);
        
        // Default center
        this.cellsCenter = [0, 0];
        
        // Start timer
        clearInterval(animation.timerId);
        animation.timerId = setInterval(() => this.animationJumpStep(), this.speedMs);
    }
    
    animationJumpStep() {
        const animation = this.animations.jump;
        const progress = animation.currentFrame / animation.frames;
        
        // Update center
        this.cellsCenter = this.convertPoint(
            animation.positionShift.col * progress * this.cellSizePx, 
            animation.positionShift.row * progress * this.cellSizePx, 
            this.calcJumpBallistic(progress, animation.firstJumpDurationPct, animation.firstJumpHeight, animation.secondJumpHeight) * this.cellSizePx
        );
        
        this.render();
        
        animation.currentFrame += 1;
        if (animation.currentFrame > animation.frames) {
            this.animationJumpStop();
        }
    }
    
    animationJumpStop() {
        const animation = this.animations.jump;
        
        // Set default center
        this.cellsCenter = [0, 0];
        
        clearInterval(animation.timerId);
        animation.inProgress = false;
        animation.callback();
    }
    
    animationPowerStart() {
        const animation = this.animations.power;
        
        // Set animation properties
        animation.currentFrame = 0;
        animation.direction = "asc";
        animation.inProgress = true;
        
        // Calc duration
        animation.frames = 100;
        
        // Default power
        this.power = 0;
        
        // Start timer
        clearInterval(animation.timerId);
        animation.timerId = setInterval(() => this.animationPowerStep(), this.speedMs);
    }
    
    animationPowerStep() {
        const animation = this.animations.power;
        const progress = animation.currentFrame / animation.frames;
        
        // Update power
        this.power = progress;
        
        this.render();
            
        animation.currentFrame += (animation.direction == "asc" ? 1 : -1);
        if (animation.currentFrame == 0 || animation.currentFrame == animation.frames) {
            animation.direction = (animation.direction == "asc" ? "desc" : "asc");
        }
    }
    
    animationPowerStop() {
        const animation = this.animations.power;
        
        clearInterval(animation.timerId);
        animation.inProgress = false;
    }
    
    calcJumpBallistic(x, maxX0, maxY0, maxY1) {
        const steepness = 3;
        let normX = 0;
        let y = 0;
        if (x <= maxX0 / 2) {
            normX = x / (maxX0 / 2);
            y = (1 - Math.pow(Math.E, -steepness * normX)) * maxY0;
            
        } else if (x <= maxX0) {
            normX = x / (maxX0 / 2) - 1;
            y = (1 - Math.pow(Math.E, -steepness * (1 - normX))) * maxY0;
            
        } else if (x <= (maxX0 + 1) / 2) {
            normX = 2 * (x - maxX0) / (1 - maxX0);
            y = (1 - Math.pow(Math.E, -steepness * normX)) * maxY1;
        } else {
            normX = (2 * x - maxX0 - 1) / (1 - maxX0);
            y = (1 - Math.pow(Math.E, -steepness * (1 - normX))) * maxY1;
        }
        
        return y;
    }
    
    convertPoint(x, y, z) {
        // Axes compression, inclination and rotation
        y = y * this.settings.axesTrasform.yCompression;
        x = x + y * this.settings.axesTrasform.sinAlpha;
        return [x * this.settings.axesTrasform.cosBetta + y * this.settings.axesTrasform.sinBetta,
                -x * this.settings.axesTrasform.sinBetta + y * this.settings.axesTrasform.cosBetta + z];
    }
    
    createCanvas() {
        // Clear container
        while (this.container.firstChild) {
            this.container.firstChild.remove();
        }
        
        // Create new canvas
        const canvas = document.createElement("canvas");
        canvas.id = this.container.id + "-canvas";
        canvas.width = this.container.offsetWidth;
        canvas.height = this.container.offsetHeight;
        
        // Append new canvas to the container
        this.container.append(canvas);
    }
    
    doJump() {
        if (this.currentCellInd >= this.cells.length - 1) {
            return;
        }
        
        const currentCell = this.cells[this.currentCellInd];
        const nextCell = this.cells[this.currentCellInd + 1];
        
        // Calc power based shift
        const shift = Math.round(this.power * (currentCell.type == 1 ? this.jumpShift.min : this.jumpShift.max));
        
        // Calc col and row shifts
        let colShift = 0;
        let rowShift = 0;
        if (currentCell.position.col == nextCell.position.col) {
            rowShift = currentCell.position.row < nextCell.position.row ? shift : -shift;
        } else {
            colShift = currentCell.position.col < nextCell.position.col ? shift : -shift;
        }
        
        // Calc correct
        let isCorrectJump = false;
        let targetCellInd = null;
        for (let ind = this.currentCellInd; 
             ind < Math.min(this.cells.length, this.currentCellInd + this.visibleCellsCount + 1); 
             ind++) {
            if (currentCell.position.col == this.cells[ind].position.col - colShift &&
                currentCell.position.row == this.cells[ind].position.row - rowShift) {
                targetCellInd = ind;
                isCorrectJump = true;
                break;
            }
        }
        
        golf.animationJumpStart(colShift, rowShift, isCorrectJump, () => {
            if (isCorrectJump) {
                this.currentCellInd = targetCellInd;
            } else {
                this.currentBallsCount -= 1;
            }
            this.power = 0;
            
            this.render();
        });
    }
    
    loadLevel(level) {
        this.currentLevel = level;
        this.currentCellInd = 0;
        this.currentBallsCount = this.ballsOnLevel;
        
        const cellsCount = level * 10;
        
        // Add first cell
        this.cells = [];
        this.cells.push(new Cell(0, 0, 0, false));
        
        // Add other cells
        let direction = "right";
        let prevChangeDirection = false;
        let shift = 1;
        let type = 0;
        for (let ind = 1; ind < cellsCount; ind++) {
            // Calc type
            type = this.randEvent(20) ? 1 : 0;
            
            // Calc shift
            shift = this.randEvent(80) ? 1 : (this.randEvent(90) ? 2 : 3);
            
            // Change direction
            if (this.randEvent(25) && !prevChangeDirection) {
                if (direction == "up" || direction == "down") {
                    direction = "right";
                } else {
                    direction = this.randEvent(50) ? "up" : "down";
                }
                prevChangeDirection = true;
            } else {
                prevChangeDirection = false;
            }
            
            this.cells.push(
                new Cell(
                    this.cells[ind - 1].position.col + (direction == "left" || direction == "right" ? (direction == "left" ? -shift : shift) : 0),
                    this.cells[ind - 1].position.row + (direction == "up" || direction == "down" ? (direction == "up" ? shift : -shift) : 0),
                    type,
                    (ind == cellsCount - 1 ? true : false)
                )
            );
        }

        this.render();
    }
    
    nextLevel() {
        this.loadLevel(this.currentLevel + 1);
    }
    
    randEvent(probability) {
        return probability > Math.random() * 100;
    }
    
    render() {
        // Clear canvas
        const canvas = this.container.firstChild;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render cells
        let visibleCellsInds = [];
        for (let ind = Math.max(0, this.currentCellInd - this.visibleCellsCount); 
             ind < Math.min(this.cells.length, this.currentCellInd + this.visibleCellsCount + 1); 
             ind++) {
            visibleCellsInds.push(ind);
        }
        visibleCellsInds.sort((x, y) => (this.cells[y].position.row == this.cells[x].position.row ? 
                                         this.cells[x].position.col - this.cells[y].position.col : 
                                         this.cells[y].position.row - this.cells[x].position.row));
        for (const ind of visibleCellsInds) {
            this.renderCell(ind, ind >= this.currentCellInd ? true : false);
        }
        
        // Render ball
        this.renderBall();
        
        // Render panel
        this.renderPanel();
    }
    
    renderBall() {
        const canvas = this.container.firstChild;
        const context = canvas.getContext("2d");
        const canvasCenter = [canvas.width / 2, canvas.height / 2];
        
        const ballSizePx = Math.round(this.cellSizePx * this.settings.ball.ratio);
        const ballCenter2d = this.convertPoint(0, 0, ballSizePx / 2);
        
        context.lineWidth = this.settings.ball.lineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.fillStyle = this.settings.ball.bgColor;
        context.strokeStyle = this.settings.ball.lineColor;
        
        // Draw the ball
        context.beginPath();
        context.arc(canvasCenter[0] + ballCenter2d[0], canvasCenter[1] - ballCenter2d[1], ballSizePx, 0, 2 * Math.PI);
        context.stroke();
        context.fill();
        
        // Draw the shadow
        context.beginPath();
        context.arc(canvasCenter[0] + ballCenter2d[0], canvasCenter[1] - ballCenter2d[1], ballSizePx * .7, 90 * 2 * Math.PI / 360, 180 * 2 * Math.PI / 360);
        context.stroke();
    }
    
    renderCell(ind, active) {
        const canvas = this.container.firstChild;
        const context = canvas.getContext("2d");
        const canvasCenter = [canvas.width / 2 + -this.cellsCenter[0], canvas.height / 2 - -this.cellsCenter[1]];
        
        const col = this.cells[ind].position.col - this.cells[this.currentCellInd].position.col;
        const row = this.cells[ind].position.row - this.cells[this.currentCellInd].position.row;
        
        context.lineWidth = this.settings.cell.lineWidth;
        context.lineCap = "round";
        context.lineJoin = "round";
        
        for (const line of this.settings.cell.geometry) {
            if (line.type == "finish" && !this.cells[ind].isFinish) {
                continue;
            }
            
            const points2d = [];
            
            for (const vertex of line.vectrexes) {
                points2d.push(
                    this.convertPoint((col + vertex[0]) * this.cellSizePx, (row + vertex[1]) * this.cellSizePx, vertex[2]  * this.cellSizePx)
                );
            }
            
            context.fillStyle = this.settings.cell.typeColors[this.cells[ind].type].bgColors[active && line.type !== "side" ? "active" : "nonactive"];
            context.strokeStyle = this.settings.cell.typeColors[this.cells[ind].type].lineColors[active && line.type !== "side" ? "active" : "nonactive"];
            
            // Draw the cell
            context.beginPath();
            context.moveTo(canvasCenter[0] + points2d[0][0], canvasCenter[1] - points2d[0][1]);
            for (let i = 1; i < points2d.length; i++) {
                context.lineTo(canvasCenter[0] + points2d[i][0], canvasCenter[1] - points2d[i][1]);
            }
            if (line.needFill) {
                context.fill();
            }
            context.stroke();
        }
    }
    
    renderPanel() {
        const canvas = this.container.firstChild;
        const context = canvas.getContext("2d");
        
        const panelCorner = [this.settings.panel.margin, this.settings.panel.margin];
        const panelWidth = canvas.width - this.settings.panel.margin * 2;
        const powerBgWidth = panelWidth - this.ballsOnLevel * 2 * this.settings.panel.lineWidth;

        const textCorner = [-Math.round(this.settings.panel.lineWidth / 2), this.settings.panel.lineWidth * 2];
        const text = "Level: " + (this.currentLevel < 10 ? "0" : "") + this.currentLevel.toString();
        
        context.font = this.settings.panel.fontSize + "px monospace";
        context.textBaseline = "middle";
        context.lineCap = "round";
        
        const lines = [];
        
        // Panel background
        lines.push({
            top: 0,
            left: 0,
            lineWidth: this.settings.panel.lineWidth * 2,
            strokeStyle: this.settings.panel.bgColor,
            width: panelWidth
        });

        // Text background
        lines.push({
            top: textCorner[1],
            left: textCorner[0],
            lineWidth: this.settings.panel.lineWidth * 2,
            strokeStyle: this.settings.panel.bgColor,
            width: context.measureText(text).width
        });
        
        // Power background
        lines.push({
            top: 0,
            left: panelWidth - powerBgWidth,
            lineWidth: this.settings.panel.lineWidth,
            strokeStyle: this.settings.panel.lineColors.nonactive,
            width: powerBgWidth
        });
        
        // Power
        if (this.power) {
            lines.push({
                top: 0,
                left: panelWidth - powerBgWidth,
                lineWidth: this.settings.panel.lineWidth,
                strokeStyle: this.settings.panel.lineColors.active,
                width: this.power * powerBgWidth
            });
        }
        
        // Balls
        for (let ind = 0; ind < this.ballsOnLevel; ind++) {
            lines.push({
                top: 0,
                left: ind * 2 * this.settings.panel.lineWidth,
                lineWidth: this.settings.panel.lineWidth,
                strokeStyle: this.settings.panel.lineColors[ind < this.currentBallsCount ? "active" : "nonactive"],
                width: 0
            });
        }
        
        // Draw lines
        for (const line of lines) {
            context.lineWidth = line.lineWidth;
            context.strokeStyle = line.strokeStyle;
            context.beginPath();
            context.moveTo(panelCorner[0] + line.left, panelCorner[1] + line.top);
            context.lineTo(panelCorner[0] + line.left + line.width, panelCorner[1] + line.top);
            context.stroke();
        }
        
        // Draw text
        context.fillStyle = this.settings.panel.lineColors.active;
        context.fillText(text, panelCorner[0] + textCorner[0], panelCorner[1] + textCorner[1]);
    }
    
    resize() {
        const canvas = this.container.firstChild;
        
        // Drop canvas size
        canvas.width = 0;
        canvas.height = 0;
        
        // Calc new canvas size
        canvas.width = this.container.offsetWidth;
        canvas.height = this.container.offsetHeight;
        
        this.render();
    }
    
    restartLevel() {
        this.currentCellInd = 0;
        this.currentBallsCount = this.ballsOnLevel;
        
        this.render();
    }
    
    setDefaultProperties() {
        // Set settings
        this.settings = {
            axesTrasform: {
                sinAlpha: Math.sin(20 * 2 * Math.PI / 360),
                sinBetta: Math.sin(25 * 2 * Math.PI / 360),
                cosBetta: Math.cos(25 * 2 * Math.PI / 360),
                yCompression: .85
            },
            ball: {
                bgColor: "#eee",
                lineColor: "#111",
                lineWidth: 1,
                ratio: 0.2
            },
            cell: {
                geometry: [
                    {
                        type: "side",
                        needFill: true,
                        vectrexes: [[.5, -.5, -.2], [.5, -.5, 0], [.5, .5, 0], [.5, .5, -.2], [.5, -.5, -.2]]
                    },
                    {
                        type: "side",
                        needFill: true,
                        vectrexes: [[-.5, -.5, -.2], [-.5, -.5, 0], [.5, -.5, 0], [.5, -.5, -.2], [-.5, -.5, -.2]]
                    },
                    {
                        type: "surface",
                        needFill: true,
                        vectrexes: [[-.5, -.5, 0], [-.5, .5, 0], [.5, .5, 0], [.5, -.5, 0], [-.5, -.5, 0]]
                    },
                    {
                        type: "finish",
                        needFill: false,
                        vectrexes: [[-.5, -.5, 0], [.5, .5, 0], [.5, -.5, 0], [-.5, .5, 0]]
                    }
                ],
                lineWidth: 1,
                typeColors: [
                    {
                        bgColors: {active: "#307050", nonactive: "#203530"},
                        lineColors: {active: "#111", nonactive: "#111"}
                    },
                    {
                        bgColors: {active: "#706530", nonactive: "#353020"},
                        lineColors: {active: "#111", nonactive: "#111"}
                    }
                ]
            },
            panel: {
                bgColor: "#111",
                fontSize: 14,
                lineColors: {active: "#eee", nonactive: "#333"},
                lineWidth: 10,
                margin: 30
            }
        };
        
        // Set animation properties
        this.animations = {
            jump: {
                callback: () => {},
                currentFrame: 0,
                firstJumpDurationPct: 0,
                firstJumpHeight: 0,
                frames: 0,
                inProgress: false,
                isCorrectJump: false,
                positionShift: {col: 0, row: 0},
                secondJumpHeight: 0,
                timerId: 0
            },
            power: {
                currentFrame: 0,
                direction: "asc",
                frames: 0,
                inProgress: false,
                timerId: 0
            }
        };
        
        // Set default properties
        this.ballsOnLevel = 0;
        this.cells = [];
        this.cellsCenter = [0, 0];
        this.cellSizePx = 0;
        this.container = null;
        this.currentBallsCount = 0;
        this.currentCellInd = 0;
        this.currentLevel = 0;
        this.jumpShift = {min: 3, max: 10};
        this.power = 0;
        this.speedMs = 0;
        this.timerId = 0;
        this.visibleCellsCount = 0;
    }
    
    setEvents() {
        this.container.addEventListener("click", () => this.userAction());
        
        document.addEventListener("keydown", (event) => {
            if (event.code == "Space") {
                this.userAction();
            }
        });
    }
    
    userAction() {
        if (this.animations.jump.inProgress) {
            return;
        } else if (!this.currentBallsCount) {
            this.restartLevel();
        } else if (this.cells[this.currentCellInd].isFinish) {
            this.nextLevel();
        } else if (this.animations.power.inProgress) {
            this.animationPowerStop();
            this.doJump();
        } else {
            this.animationPowerStart();
        }
    }
}
