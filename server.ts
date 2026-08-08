import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.ts";
import { departments, assets, orders, categories, maintenanceLogs, users } from "./src/db/schema.ts";
import { initDbSchema } from "./src/db/init.ts";
import { eq } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Initialize DB tables
  initDbSchema().catch((err) => console.error("Failed to init DB schema:", err));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", provider: "Cloud SQL (PostgreSQL)" });
  });

  // Fetch all data from Cloud SQL
  app.get("/api/sync/fetch-all", async (req, res) => {
    try {
      const [allDepts, allAssets, allOrders, allCategories, allLogs, allUsers] = await Promise.all([
        db.select().from(departments),
        db.select().from(assets),
        db.select().from(orders),
        db.select().from(categories),
        db.select().from(maintenanceLogs),
        db.select().from(users),
      ]);

      res.json({
        success: true,
        data: {
          departments: allDepts.map((d) => ({
            id: d.id,
            name: d.name,
            subDepartments: (d.subDepartments as string[]) || [],
          })),
          assets: allAssets.map((a) => ({
            id: a.id,
            customId: a.customId || "",
            name: a.name,
            department: a.department,
            subDepartment: a.subDepartment || "",
            currentQuantity: a.currentQuantity || 0,
            bookQuantity: a.bookQuantity || 0,
            difference: a.difference || 0,
            model: a.model || "",
            serialNumber: a.serialNumber || "",
            company: a.company || "",
            accessories: (a.accessories as string[]) || [],
            status: a.status || "working",
            custodian: a.custodian || "",
            notes: a.notes || "",
            image: a.image || "",
          })),
          orders: allOrders.map((o) => ({
            id: o.id,
            orderName: o.orderName || "",
            department: o.department || "",
            assetId: o.assetId || "",
            assetCustomId: o.assetCustomId || "",
            assetName: o.assetName || "",
            assetModel: o.assetModel || "",
            createdAt: o.createdAt || "",
            complaint: o.complaint || "",
            status: o.status || "red",
            supervisorName: o.supervisorName || "",
            initialReport: o.initialReport || "",
            requiredParts: o.requiredParts || "",
            finalReport: o.finalReport || "",
            technician: o.technician || "",
            receivedAt: o.receivedAt || "",
            completedAt: o.completedAt || "",
          })),
          categories: allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            defaultIntervalMeter: c.defaultIntervalMeter || undefined,
          })),
          maintenanceLogs: allLogs.map((l) => ({
            id: l.id,
            assetId: l.assetId,
            categoryName: l.categoryName,
            date: l.date,
            workDone: l.workDone || undefined,
            currentMeter: l.currentMeter || undefined,
            nextMeter: l.nextMeter || undefined,
            batteryName: l.batteryName || undefined,
            batteryModel: l.batteryModel || undefined,
            batterySerial: l.batterySerial || undefined,
            changeDate: l.changeDate || undefined,
            notes: l.notes || undefined,
          })),
          users: allUsers.map((u) => ({
            id: String(u.id),
            username: u.username || "",
            name: u.name || "",
            role: u.role || "tech",
            department: u.department || "",
          })),
        },
      });
    } catch (err: any) {
      console.error("Error fetching data from Cloud SQL:", err);
      res.status(500).json({ success: false, message: err.message || "Error fetching data" });
    }
  });

  // Push all data (bulk sync) to Cloud SQL
  app.post("/api/sync/push-all", async (req, res) => {
    try {
      const { departments: depts = [], assets: asts = [], orders: ords = [], categories: cats = [], maintenanceLogs: lgs = [], users: usrs = [] } = req.body;

      // Sync departments
      for (const d of depts) {
        if (!d.id) continue;
        await db
          .insert(departments)
          .values({
            id: d.id,
            name: d.name || "",
            subDepartments: d.subDepartments || [],
          })
          .onConflictDoUpdate({
            target: departments.id,
            set: {
              name: d.name || "",
              subDepartments: d.subDepartments || [],
            },
          });
      }

      // Sync assets
      for (const a of asts) {
        if (!a.id) continue;
        await db
          .insert(assets)
          .values({
            id: a.id,
            customId: a.customId || "",
            name: a.name || "",
            department: a.department || "",
            subDepartment: a.subDepartment || "",
            currentQuantity: Number(a.currentQuantity) || 0,
            bookQuantity: Number(a.bookQuantity) || 0,
            difference: Number(a.difference) || 0,
            model: a.model || "",
            serialNumber: a.serialNumber || "",
            company: a.company || "",
            accessories: a.accessories || [],
            status: a.status || "working",
            custodian: a.custodian || "",
            notes: a.notes || "",
            image: a.image || "",
          })
          .onConflictDoUpdate({
            target: assets.id,
            set: {
              customId: a.customId || "",
              name: a.name || "",
              department: a.department || "",
              subDepartment: a.subDepartment || "",
              currentQuantity: Number(a.currentQuantity) || 0,
              bookQuantity: Number(a.bookQuantity) || 0,
              difference: Number(a.difference) || 0,
              model: a.model || "",
              serialNumber: a.serialNumber || "",
              company: a.company || "",
              accessories: a.accessories || [],
              status: a.status || "working",
              custodian: a.custodian || "",
              notes: a.notes || "",
              image: a.image || "",
            },
          });
      }

      // Sync orders
      for (const o of ords) {
        if (!o.id) continue;
        await db
          .insert(orders)
          .values({
            id: o.id,
            orderName: o.orderName || "",
            department: o.department || "",
            assetId: o.assetId || "",
            assetCustomId: o.assetCustomId || "",
            assetName: o.assetName || "",
            assetModel: o.assetModel || "",
            createdAt: o.createdAt || "",
            complaint: o.complaint || "",
            status: o.status || "red",
            supervisorName: o.supervisorName || "",
            initialReport: o.initialReport || "",
            requiredParts: o.requiredParts || "",
            finalReport: o.finalReport || "",
            technician: o.technician || "",
            receivedAt: o.receivedAt || "",
            completedAt: o.completedAt || "",
          })
          .onConflictDoUpdate({
            target: orders.id,
            set: {
              orderName: o.orderName || "",
              department: o.department || "",
              assetId: o.assetId || "",
              assetCustomId: o.assetCustomId || "",
              assetName: o.assetName || "",
              assetModel: o.assetModel || "",
              createdAt: o.createdAt || "",
              complaint: o.complaint || "",
              status: o.status || "red",
              supervisorName: o.supervisorName || "",
              initialReport: o.initialReport || "",
              requiredParts: o.requiredParts || "",
              finalReport: o.finalReport || "",
              technician: o.technician || "",
              receivedAt: o.receivedAt || "",
              completedAt: o.completedAt || "",
            },
          });
      }

      // Sync categories
      for (const c of cats) {
        if (!c.id) continue;
        await db
          .insert(categories)
          .values({
            id: c.id,
            name: c.name || "",
            defaultIntervalMeter: c.defaultIntervalMeter || null,
          })
          .onConflictDoUpdate({
            target: categories.id,
            set: {
              name: c.name || "",
              defaultIntervalMeter: c.defaultIntervalMeter || null,
            },
          });
      }

      // Sync maintenance logs
      for (const l of lgs) {
        if (!l.id) continue;
        await db
          .insert(maintenanceLogs)
          .values({
            id: l.id,
            assetId: l.assetId || "",
            categoryName: l.categoryName || "",
            date: l.date || "",
            workDone: l.workDone || null,
            currentMeter: l.currentMeter || null,
            nextMeter: l.nextMeter || null,
            batteryName: l.batteryName || null,
            batteryModel: l.batteryModel || null,
            batterySerial: l.batterySerial || null,
            changeDate: l.changeDate || null,
            notes: l.notes || null,
          })
          .onConflictDoUpdate({
            target: maintenanceLogs.id,
            set: {
              assetId: l.assetId || "",
              categoryName: l.categoryName || "",
              date: l.date || "",
              workDone: l.workDone || null,
              currentMeter: l.currentMeter || null,
              nextMeter: l.nextMeter || null,
              batteryName: l.batteryName || null,
              batteryModel: l.batteryModel || null,
              batterySerial: l.batterySerial || null,
              changeDate: l.changeDate || null,
              notes: l.notes || null,
            },
          });
      }

      res.json({
        success: true,
        message: "تمت مزامنة جميع البيانات مع Cloud SQL بنجاح!",
      });
    } catch (err: any) {
      console.error("Error pushing data to Cloud SQL:", err);
      res.status(500).json({ success: false, message: err.message || "Error pushing data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
