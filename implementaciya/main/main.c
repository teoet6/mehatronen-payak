#include <stdio.h>
#include <math.h>
#include "driver/ledc.h"
#include "esp_err.h"
#include "esp_random.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define BONE_1 13.75
#define BONE_2 19.5

#define _2_POW_RESOLUTION 1048576

#define PI          3.141592653589793
#define PI_OVER_2   1.5707963267948966
#define PI_OVER_4   0.7853981633974483
#define PI_TIMES_2  6.283185307179586
#define PI_TIMES_10 31.41592653589793

// assume 20 bit resolution
uint32_t duty_from_degrees(uint32_t degrees) {
	if (degrees > 180) degrees = 180;

	return _2_POW_RESOLUTION * (degrees + 45) / 1800;
}

// assume 20 bit resolution
uint32_t duty_from_radians(double radians) {
	if (radians <  0) radians =  0;
	if (radians > PI) radians = PI;

	return _2_POW_RESOLUTION * (radians + PI_OVER_4) / PI_TIMES_10;
}

esp_err_t config_channel(ledc_mode_t speed_mode, ledc_channel_t channel, int gpio_num) {
	ledc_channel_config_t channel_config = {
		.gpio_num   = gpio_num,
		.speed_mode = speed_mode,
		.channel    = channel,
		.intr_type  = LEDC_INTR_DISABLE,
		.duty       = 0,
		.hpoint     = 0,
	};
	return ledc_channel_config(&channel_config);
}

double calculate_servo_1(double h, double r) {
	const double ideal = atan2(h, r) + acos((r*r + h*h + BONE_1*BONE_1 - BONE_2*BONE_2) / (2 * BONE_1 * sqrt(r*r + h*h)));
	return ideal + PI_OVER_2;
}

double calculate_servo_2(double h, double r) {
	const double ideal = PI + acos((BONE_1*BONE_1 + BONE_2*BONE_2 - r*r - h*h) / (2 * BONE_1 * BONE_2));
	return PI_TIMES_2 - ideal;
}

void set_update_duty(ledc_mode_t speed_mode, ledc_channel_t channel, uint32_t duty) {
	ledc_set_duty(speed_mode, channel, duty);
	ledc_update_duty(speed_mode, channel);
}

int s0_pins[4] = {21, 25, 14,  4};
int s1_pins[4] = {22, 33, 12,  2};
int s2_pins[4] = {23, 32, 13, 15};

void app_main(void)
{
	{
		ledc_timer_config_t timer_config = {
			.speed_mode      = LEDC_HIGH_SPEED_MODE,
			.duty_resolution = LEDC_TIMER_20_BIT,
			.timer_num       = LEDC_TIMER_0,
			.freq_hz         = 50,
			.clk_cfg         = LEDC_AUTO_CLK,
		};
		ESP_ERROR_CHECK(ledc_timer_config(&timer_config));
	}

	{
		ledc_timer_config_t timer_config = {
			.speed_mode      = LEDC_LOW_SPEED_MODE,
			.duty_resolution = LEDC_TIMER_20_BIT,
			.timer_num       = LEDC_TIMER_0,
			.freq_hz         = 50,
			.clk_cfg         = LEDC_AUTO_CLK,
		};
		ESP_ERROR_CHECK(ledc_timer_config(&timer_config));
	}

	for (int i = 0; i < 4; i += 1) {
		ESP_ERROR_CHECK(config_channel(LEDC_LOW_SPEED_MODE, i, s0_pins[i]));
	}

	for (int i = 0; i < 4; i += 1) {
		ESP_ERROR_CHECK(config_channel(LEDC_HIGH_SPEED_MODE, i, s1_pins[i]));
	}

	for (int i = 0; i < 4; i += 1) {
		ESP_ERROR_CHECK(config_channel(LEDC_HIGH_SPEED_MODE, 4 + i, s2_pins[i]));
	}

	while (true) {
		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_LOW_SPEED_MODE, i, duty_from_degrees(90));
		}
		vTaskDelay(100 / portTICK_PERIOD_MS);
		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_LOW_SPEED_MODE, i, 0);
		}

		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_HIGH_SPEED_MODE, i, duty_from_degrees(50));
		}
		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_HIGH_SPEED_MODE, i + 4, duty_from_degrees(50));
		}
		vTaskDelay(1000 / portTICK_PERIOD_MS);
		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_HIGH_SPEED_MODE, i, 0);
		}
		for (int i = 0; i < 4; i += 1) {
			set_update_duty(LEDC_HIGH_SPEED_MODE, i + 4, 0);
		}
		vTaskDelay(100 / portTICK_PERIOD_MS);
	}
}
