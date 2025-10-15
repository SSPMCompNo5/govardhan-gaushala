#!/bin/bash
# Initialize MongoDB replica set
echo "Waiting for MongoDB to start..."
sleep 15

echo "Initializing replica set..."
mongosh --host mongodb:27017 -u admin -p goshala123 --authenticationDatabase admin --eval "
try {
  rs.initiate({
    _id: 'rs0',
    members: [
      { _id: 0, host: 'mongodb:27017' }
    ]
  });
  print('Replica set initialized successfully');
} catch (e) {
  if (e.message.includes('already initialized')) {
    print('Replica set already initialized');
  } else {
    print('Error initializing replica set:', e.message);
  }
}
"

echo "Replica set initialization complete"