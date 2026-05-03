-- Create persistent librarian profile table for library service.

CREATE TABLE IF NOT EXISTS lib_librarian_profiles (
    librarian_profile_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth_users(user_id) ON DELETE CASCADE UNIQUE,
    employee_code VARCHAR(20) UNIQUE,
    shift VARCHAR(20),
    assigned_section VARCHAR(100),
    joining_date DATE,
    experience VARCHAR(100),
    qualification VARCHAR(150),
    working_hours VARCHAR(100),
    emergency_contact VARCHAR(20),
    profile_image_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
