window.addEventListener("load", () => {
    var displayArea = document.querySelector(".displayArea");

    //风格配置
    const OPEN_OPACITY = false;
    const CANVAS_SIZE = 2;

    var attractorList = [];
    var followerList = [];
    var attractorTotal = 3;
    var followerTotal = 20;
    var G = 0.0000005;
    var GSF = 0.2;
    var iSpeed = 0.1;
    //实现鼠标拖动
    var mouseIsDown = false;
    var cux = 0;
    var cuy = 0;
    //可变参数
    var sunMaxMass = 100;
    var sunMinMass = 5;
    var planetMaxMass = 2;
    var planetMinMass = 0.5;
    var colorList = [
        new RGBColor(150, 100, 0),
        new RGBColor(100, 150, 0),
        new RGBColor(150, 0, 250),
        new RGBColor(150, 0, 0),
        new RGBColor(0, 100, 155),
        new RGBColor(250, 155, 11),
    ]
    // function drawStar(x, y, r1, r2, lineb = 5, r = 0) {
    //     pushMatrix();
    //     translate(x, y);
    //     rotate(r);
    //     beginPath(0, 0);
    //     for (let i = 0; i <= 3 * PI; i += 2 * PI / lineb) {
    //         vertex(sin(i) * r1, cos(i) * r1);
    //         vertex(sin(i + PI / lineb) * r2, cos(i + PI / lineb) * r2);
    //     }
    //     endPath();
    //     popMatrix();
    // }
    class Planet extends GravityMover {
        constructor(mass, position, velocity, g) {
            super(mass, position, velocity, g);
            this.type = floor(random(0, 14));
            this.color = colorList[floor(random(0, colorList.length - 1))]
            this.minOrbitHeight = 60;
            this.maxOrbitHeight = 130;
            this.orbitHeight = random(this.minOrbitHeight, this.maxOrbitHeight);
            this.ringHeight = random(20, 30);
            //destroy
            this.dt = 1;
            this.isDestroyed = false;
            this.destroyR = random(0.09, 0.5);
            this.destroyWidth = random(1, 5);
            //ms
            this.maxSpeed = 1;
        }
        pdisplay(other) {
            let subVector = this.getFTVector(other);
            let cangle = PI + subVector.getAngle();
            let subMag = subVector.mag();
            this.radius = map(this.mass, 0, 5, 1, 15);
            //检测是否被摧毁
            if (other.state == 2 && subMag < 2000) {
                let dsRate = (2000 - subMag);
                this.dt *= 1.05;
                if (this.dt < dsRate) {
                    noFill();
                    stroke(rgba(250, 250, 250, map(this.dt, 0, dsRate, 1, 0)));
                    strokeWidth(this.destroyWidth);
                    circleCenter(this.position.x, this.position.y, this.dt * this.destroyR / 2);
                    //绘制星体
                    pushMatrix();
                    translate(this.position.x, this.position.y);
                    //绘制本体
                    noStroke();
                    fill(rgba(this.color.r, this.color.g, this.color.b, min(map(this.dt, 0, dsRate, 1, 0), map(subMag, 500, 1800, 1, 0))));
                    circleCenter(0, 0, this.radius);
                    //加上光影
                    fill(rgba(250, 250, 210, min(map(subMag, 0, 2200, 0.5, 0), map(this.dt, 0, dsRate, 1, 0))));
                    arc(0, 0, this.radius, cangle - PI / 2, cangle + PI / 2);
                    popMatrix();
                } else {
                    this.isDestroyed = true;
                }
            } else {
                pushMatrix();
                translate(this.position.x, this.position.y);
                //如果恒星发光才绘制
                if (other.state <= 2) {
                    //添加附属物
                    if (this.type == 1) {
                        //光环
                        strokeWidth(5);
                        noFill();
                        stroke(rgba(250, 250, 250, map(subMag, 500, 800, 0.1, 0)));
                        circleCenter(0, 0, this.radius + this.ringHeight);
                    } else if (this.type == 2) {
                        //卫星
                        noStroke();
                        fill(rgba(this.color.r, this.color.g, this.color.b, map(subMag, 500, 800, 1, 0)));
                        circleCenter(
                            sin(T * map(this.orbitHeight, this.minOrbitHeight, this.maxOrbitHeight, 1, 0.2)) * this.orbitHeight,
                            cos(T * map(this.orbitHeight, this.minOrbitHeight, this.maxOrbitHeight, 1, 0.2)) * this.orbitHeight,
                            this.radius / 2
                        )
                    }
                }
                //绘制本体
                noStroke();
                if (other.c3t > 20 && other.state == 3) {
                    fill(rgba(this.color.r, this.color.g, this.color.b, map(subMag, 50, 1800, 0.2, 0)));
                } else {
                    fill(rgba(this.color.r, this.color.g, this.color.b, map(subMag, 0, 1800, 1, 0)));
                }
                circleCenter(0, 0, this.radius);
                //加上光影
                if (other.c3t > 20 && other.state == 3) {
                    fill(rgba(other.currentR, other.currentG, other.currentB, map(subMag, 800, 2200, 0.2, 0)));
                } else {
                    fill(rgba(other.currentR, other.currentG, other.currentB, map(subMag, 0, 2200, 0.5, 0)));
                }
                arc(0, 0, this.radius, cangle - PI / 2, cangle + PI / 2);
                popMatrix();
            }
        }
    }
    class Sun extends GravityMover {
        constructor(mass, position, velocity, g) {
            super(mass, position, velocity, g);
            //常量
            this.V_color = 1;
            this.V_burn = G * GSF * 20000;
            this.V_mass = 5;

            //case0
            //根据质量计算拥有的燃料
            this.fuel = this.mass * 100;
            //温度
            this.temperature = this.mass ** 2;
            //燃烧的剧烈程度
            this.burnExt = this.temperature * this.V_burn;
            //半径
            this.radius = this.V_mass * this.mass;
            //光度
            this.lightRadius = this.radius ** 2 / 1000;

            //case1
            this.oradius = this.radius;
            this.c1t = 0;
            this.currentR;
            this.currentG;
            this.currentB;

            //case2
            this.c2t = 1;
            this.lightRadiusOpacity = 0.05;

            //case3
            this.c3t = 1;
            this.massLevel;

            //case4
            this.c4t = 1;

            this.isDestroyed = false;

            //ms
            this.maxSpeed = 0.2;

            //状态阶段
            this.state = 0;

            this.type = floor(random(0, 4));
            this.color = new RGBColor(
                map(this.mass, sunMinMass, sunMaxMass, 200, 255),
                map(this.mass, sunMinMass, sunMaxMass, 150, 205),
                0);
        }
        //绘制恒星
        drawSun(color) {
            fill(color);
            noStroke();
            circleCenter(
                this.position.x, this.position.y,
                this.radius,
            )
            // fill(rgb(0, 0, 0));
            // text(this.fuel, this.position.x, this.position.y)
            // text(this.state, this.position.x, this.position.y - 30)
            // text(this.c1t, this.position.x, this.position.y + 30)
        }
        //绘制星晕
        drawSunLight(color, lightLayers = 8, opacity = 0.1) {
            noStroke();
            for (let i = 0; i < lightLayers; i++) {
                let currentRadius = this.radius + i * (this.lightRadius / lightLayers);
                fill(rgba(color.r, color.g, color.b, opacity));
                circleCenter(this.position.x, this.position.y, currentRadius);
            }
            circleCenter(
                this.position.x, this.position.y,
                this.lightRadius,
            )
        }
        //计算主序星阶段的颜色
        calColor() {
            let maxT = sunMaxMass ** 2 * this.V_color;
            let minT = sunMinMass ** 2 * this.V_color;
            let st1 = minT + (maxT - minT) * 4 / 6;
            let st2 = minT + (maxT - minT) * 5 / 6;
            if (this.temperature < st1) {
                let cr = 255;
                let cg = map(this.temperature, 0, st1, 0, 255);
                let cb = 0;
                return new RGBColor(cr, cg, cb);
            } else if (this.temperature < st2) {
                let cr = 0;
                let cg = 255;
                let cb = map(this.temperature, st1, st2, 200, 255);
                return new RGBColor(cr, cg, cb);
            } else {
                let cr = map(this.temperature, st2, maxT * 3.5, 0, 255);
                let cg = 255;
                let cb = 255;
                return new RGBColor(cr, cg, cb);
            }
        }
        //计算燃料
        checkToSt1() {
            if (this.fuel > 0) {
                return false;
            } else {
                return true;
            }
        }
        pdisplay() {
            noStroke();
            switch (this.state) {
                case 0: {
                    this.drawSunLight(this.calColor());
                    this.drawSun(this.calColor());
                    if (this.checkToSt1()) {
                        this.state = 1;
                        this.fuel = -1;
                    } else {
                        this.fuel -= this.burnExt;
                    }
                    break;
                }
                case 1: {
                    if (this.radius < this.oradius * 1.98) {
                        this.radius += (this.oradius * 2 - this.radius) / 50;
                        let currentOldColor = this.calColor();
                        this.currentR = map(this.radius, this.oradius, this.oradius * 2, currentOldColor.r, 255);
                        this.currentG = map(this.radius, this.oradius, this.oradius * 2, currentOldColor.g, map(this.mass, sunMinMass, sunMaxMass, 0, 250));
                        this.currentB = map(this.radius, this.oradius, this.oradius * 2, currentOldColor.b, map(this.mass, sunMinMass, sunMaxMass, 0, 250));
                    } else {
                        this.c1t++;
                        this.lightRadius += 1;
                    }
                    this.drawSunLight(new RGBColor(this.currentR, this.currentG, this.currentB));
                    this.drawSun(new RGBColor(this.currentR, this.currentG, this.currentB));
                    if (this.c1t > 200) {
                        this.state = 2;
                        //储存当前的颜色信息
                        this.ocurrentR = this.currentR;
                        this.ocurrentG = this.currentG;
                        this.ocurrentB = this.currentB;
                        break;
                    }
                    break;
                }
                case 2: {
                    //根据质量决定演化方向
                    if (this.mass * G < (sunMinMass + (sunMaxMass - sunMinMass) / 2) * 0.0000005) {
                        this.massLevel = 1;
                        //改变星体颜色
                        this.currentR = map(this.c2t, 0, 200, this.ocurrentR, 255);
                        this.currentG = map(this.c2t, 0, 200, this.ocurrentG, 255);
                        this.currentB = map(this.c2t, 0, 200, this.ocurrentB, 255);
                        if (this.c2t > 200) {
                            this.currentR = 255;
                            this.currentG = 255;
                            this.currentB = 255;
                        }
                        //爆炸环
                        this.c2t *= 1.05;
                        noFill();
                        strokeWidth(this.c2t / 2);
                        if (this.c2t < 2000) {
                            stroke(rgba(250, 250, 250, map(this.c2t, 0, 2000, 1, 0)));
                            this.lightRadius *= 1.005;
                        }
                        circleCenter(this.position.x, this.position.y, this.c2t * 2);
                        //产生行星状星云和白矮星
                        if (this.radius > this.oradius / 20) {
                            this.radius /= 1.05;
                        } else {
                            this.radius = this.oradius / 20;
                        }
                        this.lightRadiusOpacity -= 0.0005;
                        if (this.lightRadiusOpacity > 0) {
                            this.drawSunLight(new RGBColor(this.currentR, this.currentG, this.currentB), 8, this.lightRadiusOpacity);
                        }
                        this.drawSun(new RGBColor(this.currentR, this.currentG, this.currentB));
                    } else if (this.mass * G < (sunMinMass + (sunMaxMass - sunMinMass) * 3 / 4) * 0.0000005) {
                        this.massLevel = 2;
                        //改变星体颜色
                        this.currentR = map(this.c2t, 0, 200, this.ocurrentR, 255);
                        this.currentG = map(this.c2t, 0, 200, this.ocurrentG, 255);
                        this.currentB = map(this.c2t, 0, 200, this.ocurrentB, 255);
                        if (this.c2t > 200) {
                            this.currentR = 255;
                            this.currentG = 255;
                            this.currentB = 255;
                        }
                        //爆炸环
                        this.c2t *= 1.05;
                        noFill();
                        strokeWidth(4);
                        if (this.c2t < 2000) {
                            pushMatrix();
                            translate(this.position.x, this.position.y);
                            stroke(rgba(250, 250, 250, map(this.c2t, 0, 2000, 1, 0)));
                            this.lightRadius *= 1.005;
                            translate(random(-5, 5), random(-5, 5));
                            for (let i = 0; i < 2 * PI; i += PI / 35) {
                                if (this.oradius * this.c2t / 14 < this.lightRadius) {
                                    line(
                                        sin(i) * this.lightRadius, cos(i) * this.lightRadius,
                                        sin(i) * this.oradius * this.c2t / 14, cos(i) * this.oradius * this.c2t / 14
                                    )
                                }
                            }
                            strokeWidth(min(this.c2t / 3, 20));
                            line(-this.lightRadius * 4, 0, this.lightRadius * 5, 4);
                            line(0, -this.lightRadius * 4, 0, this.lightRadius * 4);
                            popMatrix();
                        }
                        stroke(rgba(250, 250, 250, map(this.c2t, 0, 2000, 1, 0)));
                        strokeWidth(this.c2t / 2);
                        circleCenter(this.position.x, this.position.y, this.c2t * 2);
                        //产生行星状星云和白矮星
                        if (this.radius > 2) {
                            this.radius /= 1.05
                        } else {
                            this.radius = 2;
                        }
                        this.lightRadiusOpacity -= 0.0005;
                        if (this.lightRadiusOpacity > 0) {
                            this.drawSunLight(new RGBColor(this.currentR, this.currentG, this.currentB), 8, this.lightRadiusOpacity);
                        }
                        this.drawSun(new RGBColor(this.currentR, this.currentG, this.currentB));
                    } else {
                        this.massLevel = 3;
                        //改变星体颜色
                        this.currentR = map(this.c2t, 0, 200, this.ocurrentR, 255);
                        this.currentG = map(this.c2t, 0, 200, this.ocurrentG, 255);
                        this.currentB = map(this.c2t, 0, 200, this.ocurrentB, 255);
                        if (this.c2t > 200) {
                            this.currentR = 255;
                            this.currentG = 255;
                            this.currentB = 255;
                        }
                        //爆炸环
                        this.c2t *= 1.05;
                        noFill();
                        strokeWidth(4);
                        if (this.c2t < 2000) {
                            pushMatrix();
                            translate(this.position.x, this.position.y);
                            stroke(rgba(250, 250, 250, map(this.c2t, 0, 2000, 1, 0)));
                            this.lightRadius *= 1.005;
                            translate(random(-5, 5), random(-5, 5));
                            for (let i = 0; i < 2 * PI; i += PI / 35) {
                                if (this.oradius * this.c2t / 14 < this.lightRadius) {
                                    line(
                                        sin(i) * this.lightRadius, cos(i) * this.lightRadius,
                                        sin(i) * this.oradius * this.c2t / 14, cos(i) * this.oradius * this.c2t / 14
                                    )
                                }
                            }
                            strokeWidth(min(this.c2t / 3, 20));
                            line(-this.lightRadius * 4, 0, this.lightRadius * 5, 4);
                            line(0, -this.lightRadius * 4, 0, this.lightRadius * 4);
                            popMatrix();
                        }
                        stroke(rgba(250, 250, 250, map(this.c2t, 0, 2000, 1, 0)));
                        strokeWidth(this.c2t / 2);
                        circleCenter(this.position.x, this.position.y, this.c2t * 2);
                        //产生黑洞?
                        if (this.radius > 2) {
                            this.radius /= 1.1
                        } else {
                            this.radius = 0;
                        }
                        this.lightRadiusOpacity -= 0.0005;
                        if (this.lightRadiusOpacity > 0) {
                            this.drawSunLight(new RGBColor(this.currentR, this.currentG, this.currentB), 8, this.lightRadiusOpacity);
                        }
                        this.drawSun(new RGBColor(this.currentR, this.currentG, this.currentB));
                    }
                    //状态转变
                    if (this.c2t > 2200) {
                        if (this.massLevel == 1 || this.massLevel == 2) {
                            this.state = 3;
                        } else {
                            this.state = 4;
                        }
                        break;
                    } else {
                        translate(random(-3, 3), random(-3, 3));
                    }
                    break;
                }
                case 3: {
                    this.c3t++;
                    this.drawSun(new RGBColor(
                        map(this.c3t, 0, 800, this.currentR, 0),
                        map(this.c3t, 0, 800, this.currentG, 0),
                        map(this.c3t, 0, 800, this.currentB, 0),
                    ));
                    if (this.c3t < 50) {
                        translate(random(-1, 1), random(-1, 1));
                    }
                    if (this.c3t > 990) {
                        this.isDestroyed = true;
                    }
                    break;
                }
                case 4: {
                    if (this.c4t < this.mass / 3) {
                        this.c4t *= 1.01;
                    }
                    stroke(rgb(255, 255, 0));
                    noFill();
                    strokeWidth(5);
                    // circleCenter(this.position.x, this.position.y, this.c4t);
                    //绘制星晕
                    noStroke();
                    for (let i = 0; i < 10; i++) {
                        let currentRadius = this.c4t + i * (this.mass / 8);
                        fill(rgba(250, 250, 250, 0.05));
                        circleCenter(this.position.x, this.position.y, currentRadius);
                    }
                    //遮罩层
                    noStroke();
                    fill(rgb(0, 0, 0));
                    circleCenter(
                        this.position.x, this.position.y,
                        this.c4t,
                    );
                    break;
                }
            }
        }
    }
    function checkInScreen(position) {
        let leftBound = 0;
        let rightBound = 0 + width;
        let topBound = 0;
        let buttonBound = 0 + height;
        if (position.x > leftBound && position.x < rightBound && position.y < buttonBound && position.y > topBound) {
            return true;
        } else {
            return false;
        }
    }
    function genStars() {
        // //在视野外随机生成星星
        // if (random(0, 10) < 1) {
        //     let currentMass = normalRandom((sunMinMass + sunMaxMass) / 2, 50);
        //     if (currentMass < sunMinMass) {
        //         currentMass = sunMinMass;
        //     } else if (currentMass > sunMaxMass) {
        //         currentMass = sunMaxMass;
        //     }
        //     let currentPosition = new Vector(random(-width, width * 2), random(-height, height * 2));
        //     while (checkInScreen(currentPosition)) {
        //         currentPosition = new Vector(random(-width, width * 2), random(-height, height * 2));
        //     }
        //     let currentSun = new Sun(
        //         currentMass,
        //         currentPosition,
        //         new Vector(random(-5 * iSpeed, 5 * iSpeed), random(-5 * iSpeed, 5 * iSpeed)), G
        //     )
        //     attractorList.push(currentSun);
        //     for (let i = 0; i < followerTotal * random(0.5, 1.5); i++) {
        //         let follower = new Planet(
        //             random(planetMinMass, planetMaxMass),
        //             new Vector(random(currentSun.position.x - 2000, currentSun.position.x + 2000), random(currentSun.position.y - 2000, currentSun.position.y + 2000)),
        //             new Vector(random(-6 * iSpeed, 6 * iSpeed), random(-6 * iSpeed, 6 * iSpeed)), G
        //         );
        //         followerList.push(follower);
        //     }
        // }
    }
    start(displayArea, () => {
        background(rgb(0, 0, 0));
        noStroke();
        noFill();
        //添加恒星
        for (let i = 0; i < attractorTotal; i++) {
            let currentMass = normalRandom((sunMinMass + sunMaxMass) / 2, 50);
            if (currentMass < sunMinMass) {
                currentMass = sunMinMass;
            } else if (currentMass > sunMaxMass) {
                currentMass = sunMaxMass;
            }
            attractorList.push(new Sun(
                currentMass,
                new Vector(random(0, width), random(0, height)),
                new Vector(random(-5 * iSpeed, 5 * iSpeed), random(-5 * iSpeed, 5 * iSpeed)), G
            ));

        }
        //添加行星
        for (let sun of attractorList) {
            for (let i = 0; i < followerTotal * random(0.5, 1.5); i++) {
                let follower = new Planet(
                    random(planetMinMass, planetMaxMass),
                    new Vector(random(sun.position.x - 2000, sun.position.x + 2000), random(sun.position.y - 2000, sun.position.y + 2000)),
                    new Vector(random(-6 * iSpeed, 6 * iSpeed), random(-6 * iSpeed, 6 * iSpeed)), G
                );
                followerList.push(follower);
            }
        }
        //实现鼠标拖动
        mousedown = () => {
            mouseIsDown = true;
            smx = mx;
            smy = my;
        }
        mouseup = () => {
            mouseIsDown = false;
            genStars();
        }
        mousemove = () => {
            if (mouseIsDown) {
                translate(cux + (mx - pmx), cuy + (my - pmy));
            }
        }
        touchend = () => {
            genStars();
        }
        touchmove = () => {
            translate(cux + (mx - pmx), cuy + (my - pmy));
            console.log(mx, my);
        }
    }, CANVAS_SIZE);
    loop(() => {
        //根据是否打开透明度来生成背景
        if (OPEN_OPACITY) {
            if (!mouseIsDown) {
                background(rgba(0, 0, 0, 0.1));
            } else {
                background(rgba(0, 0, 0, 0.5))
            }
        } else {
            background(rgb(0, 0, 0));
        }
        //更新恒星的位置
        for (let i = 0; i < attractorList.length; i++) {
            for (let j = 0; j < attractorList.length; j++) {
                if (i != j) {
                    attractorList[i].applyForce(attractorList[j].attract(attractorList[i]));
                }
            }
            //attractorList[i].checkEdges();
            // attractorList[i].limitVelocity(attractorList[i].maxSpeed);
            attractorList[i].update();
            attractorList[i].pdisplay();
            if (attractorList[i].isDestroyed) {
                attractorList.splice(i, 1);
            }
        }
        for (let i = 0; i < followerList.length; i++) {
            for (let j = 0; j < attractorList.length; j++) {
                let force = attractorList[j].attract(followerList[i]);
                followerList[i].applyForce(force);
                followerList[i].pdisplay(attractorList[j]);
            }
            //followerList[i].checkEdges()
            // followerList[i].limitVelocity(followerList[i].maxSpeed)
            followerList[i].update();
            if (followerList[i].isDestroyed) {
                followerList.splice(i, 1);
            } else {
                // //删除离开视野的星星
                // if (!checkInScreen(followerList[i].position)) {
                //     followerList.splice(i, 1);
                // }
            }
            // alog(fps);
        }
    })
})
