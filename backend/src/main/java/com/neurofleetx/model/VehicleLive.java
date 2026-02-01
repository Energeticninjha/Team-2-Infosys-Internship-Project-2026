package com.neurofleetx.model;

public class VehicleLive {
    private String id;
    private String driverName;
    private String model;
    private String status;
    private double latitude;
    private double longitude;
    private int speed;
    private String eta;
    
    // Default constructor
    public VehicleLive() {}
    
    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }
    
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    
    public int getSpeed() { return speed; }
    public void setSpeed(int speed) { this.speed = speed; }
    
    public String getEta() { return eta; }
    public void setEta(String eta) { this.eta = eta; }
}
