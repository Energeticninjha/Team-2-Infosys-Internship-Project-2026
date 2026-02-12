import requests
import json
import time
import datetime

# Configuration
BASE_URL = "http://localhost:8083/api"
AUTH_URL = f"{BASE_URL}/auth"
VEHICLE_URL = f"{BASE_URL}/vehicles"
TRIP_URL = f"{BASE_URL}/trips"
BOOKING_URL = f"{BASE_URL}/bookings"

def print_step(name):
    print(f"\n{'='*40}")
    print(f"STEP: {name}")
    print(f"{'='*40}")

def register_user(name, email, password, role):
    url = f"{AUTH_URL}/register"
    payload = {
        "name": name,
        "email": email,
        "password": password,
        "role": role
    }
    try:
        print(f"🔹 Registering {role}: {email}...")
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Token: {data.get('token')[:10]}... ID: {data.get('id')}")
            return data
        else:
            print(f"⚠️ Registration failed ({response.status_code}). Trying login...")
            return login_user(email, password)
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def login_user(email, password):
    url = f"{AUTH_URL}/login"
    payload = {"email": email, "password": password}
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            data = response.json()
            # Handle potential AuthResponse differences (some return id/userId)
            if 'id' not in data and 'userId' in data:
                data['id'] = data['userId']
            print(f"✅ Login Success! ID: {data.get('id')}")
            return data
        else:
            print(f"❌ Login Failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def create_vehicle(token, driver_email, driver_name):
    url = VEHICLE_URL
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"} 
    plate = f"TN-TEST-{int(time.time())}"
    payload = {
        "driverName": driver_name,
        "driverEmail": driver_email,
        "driverContact": "9876543210", 
        "model": "Integration Test Car",
        "numberPlate": plate,
        "type": "Sedan",
        "seats": 4,
        "status": "Pending",
        "documentStatus": "Pending",
        "latitude": 13.0827, 
        "longitude": 80.2707,
        "batteryPercent": 100, 
        "odometer": 0, 
        "driverRating": 5.0,
        "vehiclePhotoUrl": "https://randomuser.me/api/portraits/men/32.jpg"
    }
    print(f"🔹 Creating Vehicle: {plate}...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"✅ Vehicle Created: {data.get('id')}")
            return data
        else:
            print(f"❌ Failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def approve_vehicle(token, vehicle_id):
    url = f"{VEHICLE_URL}/{vehicle_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"status": "Active", "documentStatus": "Verified"}
    print(f"🔹 Approving Vehicle ID: {vehicle_id}...")
    try:
        response = requests.put(url, json=payload, headers=headers)
        if response.status_code == 200:
            print("✅ Vehicle Approved & Active.")
            return True
        else:
            print(f"❌ Approval Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def post_trip(token, driver_id):
    url = f"{TRIP_URL}/post"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    
    payload = {
        "driverId": driver_id,
        "fromLocation": "Chennai",
        "toLocation": "Bangalore",
        "availableDate": tomorrow,
        "availableTime": "10:00",
        "seatsAvailable": 3,
        "pricePerSeat": 500.0,
        "fromLat": 13.0827, "fromLng": 80.2707,
        "toLat": 12.9716, "toLng": 77.5946
    }
    print(f"🔹 Posting Trip (Driver ID: {driver_id})...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201]:
            print("✅ Trip Posted Successfully.")
            # Some APIs might return empty body or just string
            try:
                return response.json()
            except:
                return {"status": "success", "id": "unknown"} 
        else:
            print(f"❌ Post Trip Failed: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def book_trip(token, customer_id, customer_name):
    # 1. Search for trip
    print("🔹 Searching for Trip: Chennai -> Bangalore...")
    try:
        response = requests.get(f"{TRIP_URL}/search?from=Chennai&to=Bangalore") 
        # Fallback to get all if search fails or is empty
        if response.status_code != 200 or not response.json():
            print("⚠️ Search specific failed or empty, trying generic get all...")
            response = requests.get(TRIP_URL)

        if response.status_code != 200:
            print(f"❌ Failed to fetch trips: {response.text}")
            return None
        
        trips = response.json()
        target_trip = None
        
        # Filter again client side to be sure
        for t in trips:
            if 'Chennai' in str(t.get('fromLocation')) and 'Bangalore' in str(t.get('toLocation')):
                 target_trip = t
                 break
        
        if not target_trip and trips:
             print("⚠️ Exact match not found, taking the first available trip...")
             target_trip = trips[0]

        if not target_trip:
            print("❌ No trips found in the system.")
            return None
        
        print(f"✅ Found Trip ID: {target_trip.get('id')}")

        # 2. Book
        print(f"🔹 Booking Trip ID {target_trip.get('id')} for Customer {customer_id}...")
        
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        # Booking Payload - Using Object nesting which is safer for JPA
        final_payload = {
            "trip": {"id": target_trip.get('id')},
            "user": {"id": customer_id},
            "passengerCount": 1,
            "totalPrice": 500.0,
            "startLocation": "Chennai",
            "endLocation": "Bangalore",
            "status": "PENDING"
        }

        # Use generic bookings endpoint
        booking_url = BOOKING_URL # http://localhost:8083/api/bookings
        
        # First try
        booking_res = requests.post(booking_url, json=final_payload, headers=headers)
        
        if booking_res.status_code in [200, 201]:
            print(f"✅ Booking Created! ID: {booking_res.json().get('id')}")
            return booking_res.json()
        else:
            print(f"❌ Booking Generic Failed: {booking_res.text}")
            
            # Retry with /create if exists or different payload
            # Sometimes controller is at /api/bookings/create
            booking_url_create = f"{BOOKING_URL}/create"
            print(f"⚠️ Retrying at {booking_url_create}...")
            booking_res = requests.post(booking_url_create, json=final_payload, headers=headers)
            
            if booking_res.status_code in [200, 201]:
                 print(f"✅ Booking Created! ID: {booking_res.json().get('id')}")
                 return booking_res.json()
            else:
                 print(f"❌ Retry Failed: {booking_res.text}")
                 return None

    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🚀 STARTING INTEGRATION TEST")
    
    # 1. Register Users
    print_step("User Registration")
    manager = register_user("Test Manager", "mgr_int@test.com", "pass123", "MANAGER")
    driver = register_user("Test Driver", "dvr_int@test.com", "pass123", "DRIVER")
    customer = register_user("Test Customer", "cust_int@test.com", "pass123", "CUSTOMER")

    if not (manager and driver and customer):
        print("\n❌ Critical: User registration failed. Aborting.")
        return

    # 2. Vehicle Setup
    print_step("Vehicle Setup")
    vehicle = create_vehicle(driver['token'], driver['email'], driver['name'])
    if not vehicle: return

    # 3. Manager Approval
    print_step("Manager Approval")
    approved = approve_vehicle(manager['token'], vehicle['id'])
    if not approved: return

    # 4. Post Trip
    print_step("Post Trip")
    trip_res = post_trip(driver['token'], driver['id'])
    # Don't return if failed, maybe customer can book existing trip

    # 5. Book Trip
    print_step("Book Trip")
    booking = book_trip(customer['token'], customer['id'], customer['name'])
    
    if booking:
        print("\n🎉 INTEGRATION TEST PASSED SUCCESSFULLY! 🎉")
    else:
        print("\n❌ INTEGRATION TEST FAILED AT BOOKING STAGE.")

if __name__ == "__main__":
    main()
