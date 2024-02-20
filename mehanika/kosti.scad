// TODO d1 and d2 tangent work properly

$fn=32;

servo_arm_d = 8;
servo_arm_len = 20;
servo_double_arm_len = 36;

servo_len = 23;
servo_width = 12;
servo_bolt_d = 3;
servo_bolt_offset=3;

servo_center_short = 10;
servo_center_long  = 22;

width=3.2;

border_size = 3.2;

b2_len = 150;
b2_d1 = max(30, 2*(servo_center_short+border_size) + 2);
b2_d2 = 20;

b1_len = 150;
b1_d1 = 30;
b1_d2 = b2_d1;

b0_len = 50;
b0_d   = 25;
b0_width = 35;
b0_support_len = 10;

esp_len = 55;
esp_width = 28;
esp_bolt_d = 3;

function bone_tangents(l, diams) = let (r1 = diams[0]/2, r2 = diams[1]/2, th = acos((r1-r2) / l)) [
    [-l/2 + r1 * cos(th), -r1 * sin(th)],
    [-l/2 + r1 * cos(th), +r1 * sin(th)],
    [+l/2 + r2 * cos(th), +r2 * sin(th)],
    [+l/2 + r2 * cos(th), -r2 * sin(th)],
];

module bone2d(l, diams, triangles=0) difference() {
    points=bone_tangents(l, diams);

    union() {
        polygon(points);
        translate([-l/2, 0]) circle(d=diams[0]);
        translate([+l/2, 0]) circle(d=diams[1]);
    }
    
    if ($children >= 1) translate([-b1_len/2, 0]) children(0);
    if ($children >= 2) translate([+b1_len/2, 0]) children(1);
}

function lerp(p1, p2, a) = p1*(1-a) + p2*a;

function triangles_points(triangles, lines) = [for (i=[0:triangles+1]) lerp(lines[i%2][0], lines[i%2][1], i / (triangles+1))];

module triangles_shadow(triangles, lines) {
    points = triangles_points(triangles, lines);
    
    p1 = points[0];
    p2 = points[1];
    p3 = points[len(points) - 1 - (triangles  )%2];
    p4 = points[len(points) - 1 - (triangles+1)%2];

    if (triangles == 0);
    else if (triangles == 1) polygon(points=[
        lerp(p1, p2, -0.01),
        lerp(p3, p4, -0.01),
        lerp(p1, p2, +1.01),
        lerp(p3, p4, +1.01),
    ]); else polygon(points=[
        lerp(p1, p2, -0.01),
        lerp(p1, p2, +1.01),
        lerp(p3, p4, -0.01),
        lerp(p3, p4, +1.01),
    ]);

}

module anti_triangles(triangles, lines) {
    points = triangles_points(triangles, lines);
        
    lines_th = [for (l=lines) atan2(l[1][1]-l[0][1], l[1][0]-l[0][0])];
        
    lines_vec = [for (th=lines_th) [cos(th), sin(th)]];

    for (i=[0:len(points)-2]) {
        th1 = atan2(points[i+1][1]-points[i][1], points[i+1][0]-points[i][0]) - lines_th[i%2];
        l1 = 1 / sin(th1);

        th2 = atan2(points[i+1][1]-points[i][1], points[i+1][0]-points[i][0]) - lines_th[(i+1)%2];
        l2 = 1 / sin(th2);
        
        polygon(points=[
            points[i]   - lines_vec[i    %2] * l1 * width / 2,
            points[i]   + lines_vec[i    %2] * l1 * width / 2,
            points[i+1] + lines_vec[(i+1)%2] * l2 * width / 2,
            points[i+1] - lines_vec[(i+1)%2] * l2 * width / 2,
        ]);
    }
}

function vec_norm(p) = p / norm(p);

module bone(l, diams, meat=2.0, triangles=0, line_paddings=[0, 0]) {
    points = bone_tangents(l, diams);
    
    lines = [
        [
            points[0] + line_paddings[0] * vec_norm(points[3]-points[0]),
            points[3] + line_paddings[1] * vec_norm(points[0]-points[3]),
        ],
        [
            points[1] + line_paddings[0] * vec_norm(points[2]-points[1]),
            points[2] + line_paddings[1] * vec_norm(points[1]-points[2]),
        ],
    ];
    
    linear_extrude(meat) difference() {
        bone2d(l, diams, triangles) { children(0); if ($children == 2) children(1); }
        triangles_shadow(triangles, lines);
    }
    linear_extrude(width) {
        if (triangles > 0) intersection() {
            anti_triangles(triangles, lines);
            bone2d(l, diams);
        }
        difference() {
            bone2d(l, diams);
            bone2d(l, diams - [border_size*2, border_size*2]);
        }
    }
}

module servo_geometric() {
    square([servo_len, servo_width], center=true);
    //translate([+(servo_bolt_offset + servo_len/2), 0]) circle(d=servo_bolt_d);
    //translate([-(servo_bolt_offset + servo_len/2), 0]) circle(d=servo_bolt_d);    
}

module servo() translate([servo_len/2 - servo_width/2, 0]) servo_geometric();

// bone 1
if (false) bone(b1_len, [b1_d1, b1_d2], triangles=6, line_paddings=[servo_arm_len-servo_arm_d/2, servo_arm_len-servo_arm_d/2]) {
    circle(d=servo_arm_d);
    circle(d=servo_arm_d);
}

// bone 2
if (false) bone(b2_len, [b2_d1, b2_d2], triangles=8, line_paddings=[servo_center_long, -b2_d2]) servo();

// body
if (true) linear_extrude(width) {
    difference() {
        union() {
            square([esp_len+5, esp_width+5], center=true);
            for (angle = [45:90:360]) rotate(angle) difference() {
                union() {
                    translate([0, -b0_d/2]) square([b0_len, b0_d]);
                    translate([b0_len, 0]) circle(d=b0_d);
                }
                translate([b0_len, 0]) rotate(180) servo();
            }
        }
        square([esp_len, esp_width], center=true);
    }
    
    x = esp_len/2 - esp_bolt_d/2;
    y = esp_width/2 - esp_bolt_d/2;
    for (x_sign = [-1, 1]) for (y_sign = [-1, 1]) translate([x * x_sign, y * y_sign]) difference() {
        square(esp_bolt_d+2, center=true);
        //circle(d=esp_bolt_d);
    }
}

// bone 0
if (false) union() {
    translate([servo_arm_d/2, 0, 0]) rotate([90, 0, 0]) linear_extrude(width, center=true) difference() {
        square([b0_width, b1_d1/2+width + servo_width/2]);
        translate([b0_width/2, b1_d1/2+width]) servo_geometric();
    }

    linear_extrude(width) difference() {
        union() {
            square([servo_arm_d + width * 2, servo_double_arm_len], center=true);
        }
        circle(d=servo_arm_d);
    }
    
    translate([servo_arm_d/2, 0, 0]) intersection() {
        sphere(b0_support_len);
        translate([0, -1.5*b0_support_len, 0]) cube([b0_support_len, b0_support_len*3, b0_support_len]);
    }
}