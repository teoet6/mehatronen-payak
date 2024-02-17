const $ = (query, el=document) => el.querySelector(query);

const canvas = $('#the-canvas');

const ctx = canvas.getContext('2d');

const pixelsPerMeter = 1000;

let boneLength1 = 0.20;
let boneLength2 = 0.20;
let bodyHeight  = 0.05;
let bodyRadius  = 0.10;

let mouseX = 0;
let mouseY = 0;

let targetX = 0;
let targetY = 0;

let targetLeg = 0;

// interface Leg {b: number, s0: number, s1: number, s2: number};
let legs = [
	{g: true, b: 0 * Math.PI / 2 + Math.PI / 4, s0: 0, s1: 0, s2: 0},
	{g: true, b: 1 * Math.PI / 2 + Math.PI / 4, s0: 0, s1: 0, s2: 0},
	{g: true, b: 2 * Math.PI / 2 + Math.PI / 4, s0: 0, s1: 0, s2: 0},
	{g: true, b: 3 * Math.PI / 2 + Math.PI / 4, s0: 0, s1: 0, s2: 0},
]

window.onresize = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}
window.onresize();

window.onmousemove = ev => {
	mouseX = ev.clientX;
	mouseY = ev.clientY;
}

window.onkeydown = ev => {
	switch (ev.code) {
		case 'Digit1': targetLeg = 0; break;
		case 'Digit2': targetLeg = 1; break;
		case 'Digit3': targetLeg = 2; break;
		case 'Digit4': targetLeg = 3; break;
		case 'Digit0': targetLeg = null; break;
		case 'Space': if (targetLeg != null) legs[targetLeg].g = !legs[targetLeg].g; break;
	}
}

const fillCircle = (x, y, r) => {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

const strokeCircle = (x, y, r) => {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.stroke();
}

const getTopdownTransform = () => {
	return new DOMMatrixReadOnly().translate(canvas.width/2, canvas.height/2).scale(pixelsPerMeter, -pixelsPerMeter);
}

const getSideviewTransform = (i) => {
	return new DOMMatrixReadOnly().translate(100, (i+1) * canvas.height/legs.length).scale(pixelsPerMeter, -pixelsPerMeter).translate(0, bodyHeight);
}

const transformXY = (transform, x, y) => {
	const point = transform.transformPoint(new DOMPointReadOnly(x, y));
	return [point.x, point.y];
}

const updateLeg = (leg, targetX, targetY) => {
	const legBaseX = bodyRadius * Math.cos(leg.b);
	const legBaseY = bodyRadius * Math.sin(leg.b);

	const x = targetX - legBaseX;
	const y = targetY - legBaseY;

	const r = Math.hypot(x, y);
	const h = leg.g ? -bodyHeight : 0;

	const b1 = boneLength1;
	const b2 = boneLength2;

	leg.s0 = Math.atan2(y, x) - leg.b;
	leg.s1 = Math.acos((b2*b2 - r*r - h*h - b1*b1) / (-2 * b1 * Math.hypot(r, h))) + Math.atan2(h, r);
	leg.s2 = Math.PI + Math.acos((r*r + h*h - b1*b1 - b2*b2) / (-2 * b1 * b2));
}

const update = () => {
	[targetX, targetY] = transformXY(getTopdownTransform().inverse(), mouseX, mouseY);

	if (targetLeg != null) updateLeg(legs[targetLeg], targetX, targetY);
}
window.setInterval(update, 10);

const getTopdownJoints = (leg) => {
	let joints = [];
	joints[0] = {
		x: bodyRadius * Math.cos(leg.b),
		y: bodyRadius * Math.sin(leg.b),
	}
	joints[1] = {
		x: joints[0].x + boneLength1 * Math.cos(leg.b + leg.s0) * Math.cos(leg.s1),
		y: joints[0].y + boneLength1 * Math.sin(leg.b + leg.s0) * Math.cos(leg.s1),
	}
	joints[2] = {
		x: joints[1].x + boneLength2 * Math.cos(leg.b + leg.s0) * Math.cos(leg.s1 + leg.s2),
		y: joints[1].y + boneLength2 * Math.sin(leg.b + leg.s0) * Math.cos(leg.s1 + leg.s2),
	}
	return joints;
}

const getSideviewJoints = (leg) => {
	let joints = [];
	joints[0] = {
		x: 0,
		y: 0,
	}
	joints[1] = {
		x: joints[0].x + boneLength1 * Math.cos(leg.s1),
		y: joints[0].y + boneLength1 * Math.sin(leg.s1),
	}
	joints[2] = {
		x: joints[1].x + boneLength2 * Math.cos(leg.s1 + leg.s2),
		y: joints[1].y + boneLength2 * Math.sin(leg.s1 + leg.s2),
	}
	return joints;
}

const drawJoints = (joints) => {
	console.assert(joints.length == 3);

	ctx.strokeStyle = 'green';
	ctx.beginPath();
	ctx.moveTo(joints[0].x, joints[0].y);
	ctx.lineTo(joints[1].x, joints[1].y);
	ctx.stroke();

	ctx.strokeStyle = 'blue';
	ctx.beginPath();
	ctx.moveTo(joints[1].x, joints[1].y);
	ctx.lineTo(joints[2].x, joints[2].y);
	ctx.stroke();
}

const draw = () => {
	ctx.resetTransform();

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.setTransform(getTopdownTransform());

	ctx.strokeStyle = 'black';
	ctx.lineWidth =0.005;
	strokeCircle(0, 0, bodyRadius);

	ctx.fillStyle = 'red';
	fillCircle(targetX, targetY, 0.01);

	for (const leg of legs) {
		drawJoints(getTopdownJoints(leg));
	}

	for (let i = 0; i < legs.length; i += 1) {
		ctx.setTransform(getSideviewTransform(i));

		ctx.strokeStyle = 'black';
		ctx.beginPath();
		ctx.moveTo(0,                         -bodyHeight);
		ctx.lineTo(boneLength1 + boneLength2, -bodyHeight);

		ctx.stroke();

		drawJoints(getSideviewJoints(legs[i]));
	}

	$('#debug').innerText = '';

	const degFromRad = (rad) => {
		let x = Math.round(rad * 180 / Math.PI) % 360;
		return x <= 180 ? x : x - 360;
	}

	for (let i = 0; i < legs.length; i += 1) {
		$('#debug').innerText += `Leg ${i+1}:\n`
		$('#debug').innerText += `...Servo 0: ${degFromRad(legs[i].s0)}\n`
		$('#debug').innerText += `...Servo 1: ${degFromRad(legs[i].s1)}\n`
		$('#debug').innerText += `...Servo 2: ${degFromRad(legs[i].s2)}\n`
	}

	window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
