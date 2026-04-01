import React from "react";

interface ProfileScreenProps { 
    children?: React.ReactNode; 
    userIdOverride?: string; 
    backTo?: string; 
}

export function ProfileScreen({ children }: ProfileScreenProps) { 
    return (
        <div className="profile-screen-proxy">
            {children}
        </div>
    ); 
}
