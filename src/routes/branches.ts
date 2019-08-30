import {Request, Response, NextFunction, Router} from 'express'
import Branches from '../class/branches'
import BranchSettingModel from '../models/settings'
import BranchModel from '../models/branches'
import BranchSettingsRoute from './settings'
import * as HttpStatus from 'http-status-codes' 
import AppError from '../utils/app-error';
import * as RC from '../utils/response-codes'
import { IRequest } from '../utils/interfaces';
const multiPartMiddleWare = require('connect-multiparty')()

export default class AccountRoute {

  /**
   * 
   * @param client redis client for token auth
   */
  private readonly app: Router
  constructor () {
    // initialize redis
    this.app = Router({mergeParams: true})
  }
  /**
   * add branch route
   */
  public add = (req: IRequest, res: Response, next: NextFunction) => {
    const {partnerId = ''} = req.params
    const {avatar} = req.files
    new Branches()
    .save(partnerId, {...req.body, avatar})
    .then((response) => {
      res.status(HttpStatus.OK).send({
        success: true,
        data: response
      })
    })
    .catch(err => {
      if (err.statusCode) {
        res.status(HttpStatus.BAD_REQUEST).send(err)
      } else {
        res.status(HttpStatus.BAD_REQUEST).send(new AppError(RC.ADD_BRANCH_FAILED, err.message))
      }
    })
  }
  /**
   * get branch data by branchId
   */
  public findByBranchId = async (req: IRequest, res: Response, next: NextFunction) => {
    const {branchId = ''} = req.query
    return BranchModel
      .findOne({
        branchId: branchId.toString().trim()
      })
      .then(async (branch) => {
        if (!branch) {
          throw new Error('No branch found.')
        }
        const settings = await BranchSettingModel.findOne({
          branchId: branchId
        })
        res.status(HttpStatus.OK).send({
          ...JSON.parse(JSON.stringify(branch)),
          settings: settings
        })
      })
      .catch(err => {
        if (err.statusCode) {
          res.status(HttpStatus.BAD_REQUEST).send(err)
        } else {
          res.status(HttpStatus.BAD_REQUEST).send(new AppError(RC.ADD_BRANCH_FAILED, err.message))
        }
      })
  }
  /**
   * get branch data by id
   */
  public findOne = async (req: IRequest, res: Response, next: NextFunction) => {
    const {branchId = ''} = req.params
    try {
      const branch = await new Branches().findOne({
        _id: branchId
      })
      const settings = await BranchSettingModel.findOne({
        branchId: branchId
      })
      res.status(HttpStatus.OK).send({
        ...JSON.parse(JSON.stringify(branch)),
        settings: settings
      })
    } catch (err) {
      if (err.statusCode) {
        res.status(HttpStatus.BAD_REQUEST).send(err)
      } else {
        res.status(HttpStatus.BAD_REQUEST).send(new AppError(RC.ADD_BRANCH_FAILED, err.message))
      }
    }
  }
  public initializeRoutes () {
    this.app.get('/branchId', )
    this.app.post('/:partnerId', multiPartMiddleWare, this.add)
    this.app.get('/:branchId', this.findOne)
    this.app.patch('/:branchId/settings', new BranchSettingsRoute().initializeRoutes())
    return this.app
  }
}