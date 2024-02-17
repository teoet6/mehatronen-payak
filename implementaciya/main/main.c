#include <stdio.h>
#include "driver/ledc.h"
#include "esp_err.h"
#include "esp_random.h"

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

uint32_t degrees_to_duty(uint32_t degrees, ledc_timer_bit_t);

// assume 50Hz
// assume 180° max
uint32_t degrees_to_duty(uint32_t degrees, ledc_timer_bit_t resolution) {
	return (1 << resolution) * (degrees + 45) / 90 / 20;
}

void app_main(void)
{
	ledc_mode_t speed_mode = LEDC_HIGH_SPEED_MODE;
	ledc_channel_t channel = 0;
	ledc_timer_bit_t resolution = LEDC_TIMER_20_BIT;

	{
		ledc_timer_config_t timer_config = {
			.speed_mode      = speed_mode,
			.duty_resolution = resolution,
			.timer_num       = LEDC_TIMER_0,
			.freq_hz         = 50,
			.clk_cfg         = LEDC_AUTO_CLK,
		};
		ESP_ERROR_CHECK(ledc_timer_config(&timer_config));

		ledc_channel_config_t channel_config = {
			.gpio_num   = 14,
			.speed_mode = speed_mode,
			.channel    = channel,
			.intr_type  = LEDC_INTR_DISABLE,
			.duty       = 0,
			.hpoint     = 0,
		};
		ESP_ERROR_CHECK(ledc_channel_config(&channel_config));
	}

	while (true) {
		for (uint32_t degree = 0; degree < 180; degree += 1) {
			const uint32_t duty_cycle = degrees_to_duty(degree, resolution);

			printf("degree=%lu duty_cycle=%lu\n", degree, duty_cycle);

			ledc_set_duty(speed_mode, channel, duty_cycle);
			ledc_update_duty(speed_mode, channel);
			vTaskDelay(50 / portTICK_PERIOD_MS);
		}
	}
}
