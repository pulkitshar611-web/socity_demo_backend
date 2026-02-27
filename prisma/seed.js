const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function clearDatabase() {
  console.log('Clearing database...')
  const tablenames = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
  
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0;`
  
  for (const { table_name } of tablenames) {
    if (table_name !== '_prisma_migrations') {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table_name}\``)
      } catch (error) {
        console.error(`Error truncating ${table_name}:`, error.message)
      }
    }
  }
  
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1;`
  console.log('Database cleared.')
}

async function main() {
  await clearDatabase()

  console.log('Seeding identical 6 core users based on UI...')

  // 1. Create essential Society
  const society = await prisma.society.create({
    data: {
      name: 'Modern Living Society',
      address: '123 Tech Park, Bangalore',
      code: 'SOC001',
      status: 'ACTIVE',
      subscriptionPlan: 'PROFESSIONAL'
    }
  })

  // 2. Create Platform society for chat (Individual ↔ Super Admin)
  const platformSociety = await prisma.society.create({
    data: {
      name: 'Kiaan Technology Platform',
      address: 'Corporate Office, Gurugram',
      code: 'PLATFORM',
      status: 'ACTIVE'
    }
  })

  // 3. Define 6 core users matching frontend/src/app/auth/login/page.tsx
  const users = [
    { email: 'superadmin@society.com', password: 'super123', name: 'Super Admin', role: 'SUPER_ADMIN' },
    { email: 'admin@society.com', password: 'admin123', name: 'Society Admin', role: 'ADMIN' },
    { email: 'resident@society.com', password: 'resident123', name: 'Resident User', role: 'RESIDENT' },
    { email: 'guard@society.com', password: 'guard123', name: 'Security Guard', role: 'GUARD' },
    { email: 'test4@gmail.com', password: '11111111', name: 'Maintenance Vendor', role: 'VENDOR' },
    { email: 'individual@example.com', password: 'user123', name: 'Individual User', role: 'INDIVIDUAL' },
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
        status: 'ACTIVE',
        societyId: userData.role === 'SUPER_ADMIN' || userData.role === 'INDIVIDUAL' ? platformSociety.id : society.id,
        phone: '97521 00980'
      }
    })
    console.log(`Created: ${userData.email} (${userData.role})`)
  }

  // 4. Create a sample unit for Resident
  const resident = await prisma.user.findFirst({ where: { role: 'RESIDENT' } })
  await prisma.unit.create({
    data: {
      block: 'A',
      number: '101',
      floor: 1,
      type: '3BHK',
      areaSqFt: 1500,
      societyId: society.id,
      ownerId: resident.id,
      status: 'OCCUPIED'
    }
  })

  // 5. System Settings
  const settings = [
    { key: 'platformName', value: 'Kiaan Technology Society' },
    { key: 'supportEmail', value: 'info@kiaantechnology.com' },
    { key: 'maintenanceMode', value: 'false' },
    { key: 'contactNumber', value: '97521 00980' }
  ]
  for (const s of settings) {
    await prisma.systemSetting.create({ data: s })
  }

  console.log('Seeding of 6 core users completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
