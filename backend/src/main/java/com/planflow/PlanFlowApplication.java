package com.planflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PlanFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlanFlowApplication.class, args);
    }
}
