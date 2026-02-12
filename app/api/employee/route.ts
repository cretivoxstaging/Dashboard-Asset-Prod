import { NextResponse } from "next/server";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function authHeaders() {
  const token = process.env.EMPLOYEE_API_TOKEN;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
    "x-api-token": token,
  } as Record<string, string>;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    
    const baseUrl = getEnv("EMPLOYEE_API_URL");
    const url = name 
      ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}name=${encodeURIComponent(name)}`
      : baseUrl;
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...authHeaders(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch employees" }, { status: res.status });
    }
    
    const json = text ? JSON.parse(text) : null;
    
    // Filter out employees with status "Resign"
    function filterResignedEmployees(data: unknown): unknown {
      if (Array.isArray(data)) {
        return data.filter((item) => {
          if (item && typeof item === "object") {
            const emp = item as Record<string, unknown>;
            return emp.employee_status !== "Resign";
          }
          return true;
        });
      }
      
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        
        // Handle different response structures
        if (Array.isArray(obj.data)) {
          return {
            ...obj,
            data: obj.data.filter((item: unknown) => {
              if (item && typeof item === "object") {
                const emp = item as Record<string, unknown>;
                return emp.employee_status !== "Resign";
              }
              return true;
            }),
          };
        }
        
        if (Array.isArray(obj.employees)) {
          return {
            ...obj,
            employees: obj.employees.filter((item: unknown) => {
              if (item && typeof item === "object") {
                const emp = item as Record<string, unknown>;
                return emp.employee_status !== "Resign";
              }
              return true;
            }),
          };
        }
        
        if (Array.isArray(obj.results)) {
          return {
            ...obj,
            results: obj.results.filter((item: unknown) => {
              if (item && typeof item === "object") {
                const emp = item as Record<string, unknown>;
                return emp.employee_status !== "Resign";
              }
              return true;
            }),
          };
        }
      }
      
      return data;
    }
    
    const filteredData = filterResignedEmployees(json);
    
    return NextResponse.json(filteredData, {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
