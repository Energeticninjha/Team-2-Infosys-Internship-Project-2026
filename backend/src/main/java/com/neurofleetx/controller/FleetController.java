package com.neurofleetx.controller;

import com.neurofleetx.model.dto.RouteOption;
import com.neurofleetx.model.dto.RouteRequest;
import com.neurofleetx.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fleet")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class FleetController {

    @Autowired
    private RouteService routeService;

    @PostMapping("/optimize-route")
    public List<RouteOption> optimizeRoute(@RequestBody RouteRequest request) {
        return routeService.calculateRoutes(request);
    }
}
