import {Schema, Document, model} from 'mongoose'
import IBranchSettings from '../interfaces/settings'
//import Logs from '../class/logs';
export interface IBranchSettingsModel extends Document, IBranchSettings {}
const socialLinksSchema = new Schema({
  id: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  }
}, {_id: false})
export const ModelSchema:Schema = new Schema({
  _id: {
    type: String,
    default: ''
  },
  branchId: {
    type: String,
    default: ''
  },
  bannerUrl: {
    type: String,
    default: ''
  },
  autoAssignQueue: {
    type: Boolean,
    default: false
  },
  isWeeklyOpened: {
    type: Boolean,
    default: true
  },
  tvDisplayType: {
    type: String,
    default: 'queue'
  },
  operationHours: [
    {
      _id: {
        type: String,
        default: ''
      },
      startValue: {
        type: Number,
        default: 0
      },
      endValue: {
        type: Number,
        default: 0
      },
      enabled: {
        type: Boolean,
        default: false
      },
      day: {
        type: Number,
        default: null
      },
      isWholeDay: {
        type: Boolean,
        default: false
      }
    }
  ],
  gallery: [
    {
      _id: {
        type: String,
        default: ''
      },
      imageUrl: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Number,
        default: Date.now()
      }
    }
  ],
  reservationTimeSlots: {
    availableDays: [
      {
        type: Number,
        default: 0
      }
    ],
    timeLists: [
      {
        capacity: {
          type: Number,
          default: 0
        },
        value: {
          type: Number,
          default: 0
        },
        id: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Number,
          default: Date.now()
        }
      }
    ]
  },
  reservationSettings: {
    cutOffHours: {
      type: Number,
      default: 3
    },
    timeSlots: [
      {
        _id: {
          type: String,
          default: ''
        },
        day: {
          type: Number,
          default: 0
        },
        lists: [
          {
            capacity: {
              type: Number,
              default: 0
            },
            value: {
              type: Number,
              default: 0
            },
            _id: {
              type: String,
              default: ''
            },
            createdAt: {
              type: Number,
              default: Date.now()
            }
          }
        ]
      }
    ]
  },
  contacts: [
    {
      _id: {
        type: String,
        default: ''
      },
      isPrimary: {
        type: Boolean,
        default: false
      },
      number: {
        type: String,
        default: ''
      },
      type: {
        type: String,
        default: ''
      }
    }
  ],
  modules: [
    {
      type: Number
    }
  ],
  socialLinks: [
    socialLinksSchema
  ],
  printingDetails: {
    status: {
      type: Boolean,
      default: false
    },
    qrDesc: {
      type: String,
      default: ''
    },
    qrLink: {
      type: String,
      default: ''
    }
  },
  smsSettings: {
    status: {
      type: Boolean,
      default: true
    },
    notifyNo: {
      type: Number,
      default: 3
    },
    costValue: {
      type: Number,
      default: 0.40
    }
  },
  smsConfig: {
    number: {
      type: Number,
      default: 0
    },
    status: {
      type: Boolean,
      default: true
    }
  },
  smsCredit: {
    consumed: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  seatsCapacity: {
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 0
    }
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  totalQueueGroup: {
    type: Number,
    default: Date.now()
  },
  createdAt: {
    type: Number,
    default: Date.now()
  },
  updatedAt: {
    type: Number,
    default: Date.now()
  }
})
//new Logs(ModelSchema, 'branches')
export default model<IBranchSettingsModel>("settings", ModelSchema);