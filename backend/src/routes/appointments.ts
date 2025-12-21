import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import { z } from "zod";

const appointmentsRouter = new Hono<AppType>();

const createAppointmentSchema = z.object({
  date: z.string(),
  timeSlot: z.enum(["morning", "afternoon"]),
  listingId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

// POST /api/appointments - Book an appointment
appointmentsRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const data = createAppointmentSchema.parse(body);

    const appointment = await db.appointment.create({
      data: {
        userId: user.id,
        listingId: data.listingId ?? null,
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        notes: data.notes ?? null,
      },
    });

    return c.json({
      id: appointment.id,
      date: appointment.date.toISOString(),
      timeSlot: appointment.timeSlot,
      status: appointment.status,
    }, 201);
  } catch (error) {
    console.error("Error creating appointment:", error);
    return c.json({ error: "Failed to create appointment" }, 500);
  }
});

// GET /api/appointments - Get user's appointments
appointmentsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const appointments = await db.appointment.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });

    return c.json({
      appointments: appointments.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        timeSlot: a.timeSlot,
        status: a.status,
        listingId: a.listingId,
      })),
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return c.json({ error: "Failed to fetch appointments" }, 500);
  }
});

export { appointmentsRouter };
