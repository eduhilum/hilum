import { faker } from '@faker-js/faker'
import { type User } from './schema'

// Set a fixed seed for consistent data generation
faker.seed(67890)

export const users: User[] = Array.from({ length: 50 }, () => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    id: faker.string.uuid(),
    candidate_id: `HLM-${faker.number.int({ min: 1000, max: 9999 })}`,
    full_name: `${firstName} ${lastName}`,
    email: faker.internet.email({ firstName }).toLocaleLowerCase(),
    status: faker.helpers.arrayElement([
      'active',
      'inactive',
      'invited',
      'suspended',
    ]),
    role: faker.helpers.arrayElement([
      'admin',
      'faculty',
      'candidate',
    ]),
    is_pro_pass_active: faker.datatype.boolean(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  }
})
