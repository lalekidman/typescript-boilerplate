import {Request, Response, NextFunction, Router} from 'express'
import BranchSettings from '../class/settings'
import * as HttpStatus from 'http-status-codes' 
import AppError from '../utils/app-error';
import * as RC from '../utils/response-codes'
import { IRequest, IUpdateBranchAdvertisementSettings } from '../utils/interfaces';
const multiPartMiddleWare = require('connect-multiparty')()
import {validateModules, getFileSize, constructActionBy} from '../utils/helper'
import AdvertisementSettings from '../class/advertisement-settings'
import * as appConstants from '../utils/constants'
import {IUpdateBranchQueueSettings} from '../utils/interfaces'
import uuid = require('uuid');
import * as regExp from '../utils/regularExpressions'
import notification from '../class/notification';
import { IBranchSettingsModel } from '../models/settings';
const advertisementSettings: AdvertisementSettings = new AdvertisementSettings()
export default class Route {
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
   * ** MIDDLEWARE ** on update advertisement settings 
   */
  private onUpdateAdvertisementSettings(req: IRequest, res: Response, next: NextFunction) {
    // check file formats
    if (req.files) {
      let {media} = req.files
      // ensure that media will be an array
      if (typeof(media) !== 'undefined') {
        if (!Array.isArray(media)) {
          media = [media]
        }
        for (let i in media) {
          const fileType = media[i].type
          if (!regExp.validImages.test(fileType) && !regExp.validVideos.test(fileType)) {
            return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS,
              'Valid File Types: image(jpeg, jpg, png, gif, bmp, tiff) , video(mp4, webm, ogg)')) 
          }
        }
      }
    }
    let {data} = req.body
    try {
      data = JSON.parse(data)
    }
    catch (error) {
      console.log(error)
      return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS,
        '**@request body.data is JSON unparsable'))
    }
    const {enableCustomQr=false, customQrLink, imagePreviewDuration=3, advertisements=[], adsToDelete=[]} = data
    // verify request.body
    if (typeof(enableCustomQr) !== 'boolean' ||
    typeof(imagePreviewDuration) !== 'number' ||
    !Array.isArray(advertisements)) {
      return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS))
    }
    for (let i in advertisements) {
      if (typeof advertisements[i]._id === 'undefined' || typeof advertisements[i].isActive !== 'boolean' || typeof advertisements[i].sortIndex !== 'number') {
        return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS, 
          'gallery must be like: [{_id: "someIdHere", isActive:boolean, sortIndex:number}]'))
      }
    }
    if (imagePreviewDuration < 3) {
      return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS, 
        'imagePreviewDuration minimum value is 3'))
    }
    if (!regExp.validUrl.test(customQrLink) && customQrLink) {
      return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS, 
        'invalid Link'))
    }
    for (let i in adsToDelete) {
      if (typeof(adsToDelete[i]) !== 'string') {
        return res.status(HttpStatus.BAD_REQUEST).json(new AppError(RC.BAD_REQUEST_UPDATE_BRANCH_ADVERTISEMENT_SETTINGS, 
          '** request body: adsToDelete:Array<string>'))
      }
    }
    next()
  }

  /**
   * validate if file exists
   */
  private fileExists(req: IRequest, res: Response, next: NextFunction) {
    if (typeof(req.files) === 'undefined') {
      return res.status(HttpStatus.BAD_REQUEST)
      .json(new AppError(RC.INALID_VALUE, '@requestBody(required): {media:file}'))
    }
   next()
  }

  /**
   * get branch Advertisement Settings
   */
  private getBranchAdvertisementSettings(req: IRequest, res: Response) {
    const {branchId} = req.params
    advertisementSettings.getBranchAdvertisementSettings(branchId)
    .then((adSettings) => {
      res.status(HttpStatus.OK).json(adSettings)
    })
    .catch((error) => {
      res.status(HttpStatus.NOT_FOUND).json(error)
    })
  }

  /**
   * update branch Advertisement Settings
   */
  private updateBranchAdvertisementSettings = async (req: IRequest, res: Response) => {
    const {branchId} = req.params
    const oldData = <IBranchSettingsModel> await advertisementSettings.getBranchAdvertisementSettings(branchId)
    let payload = JSON.parse(req.body.data)
    // @ts-ignore
    let accountData = JSON.parse(req.headers.user)
    // @ts-ignore
    let platform: string = req.headers.client
    // upload image first
    if (req.files && req.files.media) {
      try {
        await this.uploader(req, res, 'advertisements')
      }
      catch(error) {
        return error
      }
    }
    console.log('PAYLOAD >>>>>>>>>>>>', payload)
    const {enableCustomQr=false, customQrLink='', imagePreviewDuration=3, advertisements=[], adsToDelete=[]} = payload
    const data: IUpdateBranchAdvertisementSettings = {
      //@ts-ignore
      enableCustomQr,
      customQrLink,
      imagePreviewDuration,
      advertisements,
      adsToDelete
    }
    // update other form data
    advertisementSettings.updateBranchAdvertisementSettings(branchId, data, oldData, platform, constructActionBy(accountData.account))
    .then((updatedSettings) => {
      req.app.get('redisPublisher').publish('UPDATE_ADVERTISEMENT_SETTINGS', JSON.stringify({data: updatedSettings, branchId}))
      // notify business
      notification.invokeNotif(
        branchId,
        {
          actionBy: `${accountData.account.firstName} ${accountData.account.lastName}`
        },
        appConstants.BRANCH_NOTIFICATION_TYPES.ADVERTISEMENT_SETTINGS_UPDATE
      )
      res.status(HttpStatus.OK).json(updatedSettings)
    })
    .catch((error) => {
      res.status(HttpStatus.NOT_FOUND).json(error)
    })
  }

  /**
   * image uploader function
   */
  private async uploader(req: IRequest, res: Response, location: string) {
    const {branchId} = req.params
    let {media} = req.files
    // ensure that media will be an array
    if (!Array.isArray(media)) {
      media = [media]
    }
    // @ts-ignore
    if (media.length > process.env.MAX_UPLOAD_LIMIT) {
      return res.status(HttpStatus.BAD_REQUEST)
      .json(new AppError(RC.FILE_UPLOAD_ERROR, 
      `maximum upload limit is ${process.env.MAX_UPLOAD_LIMIT}`))
    }
    for (let i in media) {
      const fileSize = getFileSize(media[i].path)
      try {
        let upload = await advertisementSettings.uploadImage(branchId, media[i], fileSize, location)
        if (parseInt(i) === media.length - 1) {
          return upload
        }
      }
      catch (error) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error)
      }
    }
    return
  }

  /**
   * upload to gallery
   */
  private uploadToGallery = async (req: IRequest, res: Response) => {
    try {
      let upload = await this.uploader(req, res, 'gallery')
      req.app.get('redisPublisher').publish('UPDATE_GALLERY', JSON.stringify({data: upload, branchId: req.params.branchId}))      
      return res.status(HttpStatus.OK).json(upload)
    }
    catch(error) {
      return error
    }
  }

  /**
   * upload to ads
   */
  private uploadToAds = async (req: IRequest, res: Response) => {
    try {
      let upload = await this.uploader(req, res, 'advertisements')
      return res.status(HttpStatus.OK).json(upload)
    }
    catch(error) {
      return error
    }
  }

  /**
   * delete media from gallery
   */
  private deleteMedia(req: IRequest, res: Response) {
    const {branchId, mediaId} = req.params
    advertisementSettings.deleteMedia(branchId, mediaId, 'gallery')
    .then((updatedSettings) => {
      res.status(HttpStatus.OK).json(updatedSettings)
    })
    .catch((error) => {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error)
    })
  }

  public initializeRoutes() {
    this.app.get('/', this.getBranchAdvertisementSettings)
    this.app.patch('/', multiPartMiddleWare, this.onUpdateAdvertisementSettings, this.updateBranchAdvertisementSettings)
    this.app.post('/gallery/upload', multiPartMiddleWare, this.fileExists, this.uploadToGallery)
    this.app.post('/ads/upload', multiPartMiddleWare, this.fileExists, this.uploadToAds)
    this.app.delete('/gallery/:mediaId', this.deleteMedia)
    return this.app
  }
}